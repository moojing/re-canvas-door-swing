import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import ts from "typescript";
import {
  POC_GALLERY_ITEMS,
  resolvePocThumbnailUrl,
} from "./pocGalleryData.ts";

type ReactElementLike = React.ReactElement<{
  children?: React.ReactNode;
  onError?: (event: { currentTarget: { style: Record<string, string> } }) => void;
  href?: string;
  src?: string;
  alt?: string;
}>;

const findElements = (
  node: React.ReactNode,
  predicate: (element: ReactElementLike) => boolean,
): ReactElementLike[] => {
  if (!React.isValidElement(node)) return [];

  const matches = predicate(node as ReactElementLike) ? [node as ReactElementLike] : [];
  const { children } = (node as ReactElementLike).props;
  const descendants = React.Children.toArray(children).flatMap((child) =>
    findElements(child, predicate)
  );
  return [...matches, ...descendants];
};

const loadPocGallery = () => {
  const require = createRequire(import.meta.url);
  const sourcePath = fileURLToPath(new URL("./PocGallery.tsx", import.meta.url));
  const source = readFileSync(sourcePath, "utf-8").replaceAll(
    "import.meta.env.BASE_URL",
    '"/"',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} as { default?: () => React.ReactElement } };
  const exports = module.exports;
  const runtime = {
    module,
    exports,
    require: (specifier: string) => {
      if (specifier === "react/jsx-runtime") return require("react/jsx-runtime");
      if (specifier === "react-router-dom") {
        return {
          Link: ({
            to,
            children,
            ...props
          }: {
            to: string;
            children?: React.ReactNode;
          }) => React.createElement("a", { ...props, href: to }, children),
        };
      }
      if (specifier === "./pocGalleryData") {
        return { POC_GALLERY_ITEMS, resolvePocThumbnailUrl };
      }
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
  };

  Function("module", "exports", "require", compiled)(
    runtime.module,
    runtime.exports,
    runtime.require,
  );

  if (!module.exports.default) {
    throw new Error("Failed to load PocGallery component");
  }
  return module.exports.default;
};

test("PocGallery renders every card with the expected detail href", () => {
  const PocGallery = loadPocGallery();
  const html = renderToStaticMarkup(React.createElement(PocGallery));

  for (const item of POC_GALLERY_ITEMS) {
    assert.match(html, new RegExp(`href="${item.route}"`));
  }
});

test("PocGallery hides a thumbnail when the image load fails", () => {
  const PocGallery = loadPocGallery();
  const tree = PocGallery();
  const images = findElements(
    tree,
    (element) => typeof element.type === "string" && element.type === "img",
  );

  assert.equal(images.length, POC_GALLERY_ITEMS.length);
  for (const [index, image] of images.entries()) {
    assert.equal(
      image.props.src,
      resolvePocThumbnailUrl("/", POC_GALLERY_ITEMS[index].thumbnailPath),
    );
    assert.equal(
      image.props.alt,
      `${POC_GALLERY_ITEMS[index].title} animation preview`,
    );

    const style: Record<string, string> = {};
    image.props.onError?.({ currentTarget: { style } });
    assert.equal(style.display, "none");
  }
});
