import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    // React 18 forwards this as an HTML attribute; an empty string enables it.
    inert?: "";
  }
}
