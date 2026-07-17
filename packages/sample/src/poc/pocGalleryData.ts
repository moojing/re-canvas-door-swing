export const POC_GALLERY_ITEMS = Object.freeze([
  Object.freeze({
    id: "A11",
    title: "Heavy Water Door",
    description:
      "Primitive relief geometry with a procedural heavy-metal finish.",
    route: "/poc/a11",
    thumbnailPath: "poc-thumbnails/a11.png",
    sha256: "8c1eca6248225dc2762b3efe6c803892fa3ef871e64826441f5fee200ece01f4",
  }),
  Object.freeze({
    id: "B10",
    title: "Sewer Gate",
    description:
      "Extruded interlocking teeth with opposing vertical motion.",
    route: "/poc/b10",
    thumbnailPath: "poc-thumbnails/b10.png",
    sha256: "409be1a376ee70e99e202fca64584e5809d899c6ca763603e104581e86b06365",
  }),
  Object.freeze({
    id: "C03",
    title: "Lift Platform",
    description: "Primitive lift platform with procedural rust and mesh.",
    route: "/poc/c03",
    thumbnailPath: "poc-thumbnails/c03.png",
    sha256: "1c158a398bcc0fc0ac70f203d6faba6ac0e6d9cdb12dd027d167a7b05f44fb56",
  }),
  Object.freeze({
    id: "B05",
    title: "Arched Double Gate",
    description:
      "Generated arched iron leaves with mirrored inward swing.",
    route: "/poc/b05",
    thumbnailPath: "poc-thumbnails/b05.png",
    sha256: "77c7e2262f25206d6b0182d8c2bf451b494baf3ee2743da2bbae6dd0e143ef31",
  }),
  Object.freeze({
    id: "B06",
    title: "Heavy Water Double Door",
    description:
      "Generated Normal and Frozen leaves with valve-first motion.",
    route: "/poc/b06",
    thumbnailPath: "poc-thumbnails/b06.png",
    sha256: "853f5ef4d458c099d8e49cbd6166692329f2d249c9bf374ad4c586cd097abc0c",
  }),
]);

export const resolvePocThumbnailUrl = (
  baseUrl: string,
  thumbnailPath: string,
): string => {
  const normalizedBase = baseUrl.replace(/^\/+|\/+$/g, "");
  const normalizedThumbnailPath = thumbnailPath.replace(/^\/+/, "");
  return `/${[normalizedBase, normalizedThumbnailPath].filter(Boolean).join("/")}`;
};
