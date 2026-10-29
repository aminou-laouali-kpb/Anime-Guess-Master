import { useEffect, useRef } from "react";

export const APP_NAME = "AnimeWho";

// Each screen replaces the previous one without a page load, so screen-reader
// users wouldn't notice the change: name the tab after the screen, and move
// the focus to the screen's heading (give it tabIndex={-1}) when it appears.
// `focusOnMount` is read once: pass false when a dialog opens with the screen,
// since the dialog takes the focus itself.
export function usePageHeading<T extends HTMLElement = HTMLHeadingElement>(
  title: string,
  focusOnMount = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    document.title = title.startsWith(APP_NAME) ? title : `${title} — ${APP_NAME}`;
  }, [title]);

  const shouldFocus = useRef(focusOnMount);
  useEffect(() => {
    if (shouldFocus.current) ref.current?.focus({ preventScroll: true });
  }, []);

  return ref;
}
