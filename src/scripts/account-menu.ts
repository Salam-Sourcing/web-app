export function bindAccountMenus() {
  const menus = document.querySelectorAll<HTMLDetailsElement>(
    "[data-account-menu]",
  );
  menus.forEach((menu) => {
    const close = () => {
      menu.open = false;
    };
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
        menu.querySelector<HTMLElement>("summary")?.focus();
      }
    });
    menu.addEventListener("toggle", () =>
      menu
        .querySelector("summary")
        ?.setAttribute("aria-expanded", String(menu.open)),
    );
    document.addEventListener("click", (event) => {
      if (event.target instanceof Node && !menu.contains(event.target)) close();
    });
    menu.addEventListener("focusout", (event) => {
      if (
        event.relatedTarget instanceof Node &&
        !menu.contains(event.relatedTarget)
      )
        close();
    });
  });
}
