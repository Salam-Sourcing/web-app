let timer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string, error = false) {
  let node = document.querySelector<HTMLElement>("[data-toast]");
  if (!node) {
    node = document.createElement("div");
    node.dataset.toast = "";
    node.className = "action-toast";
    document.body.append(node);
  }
  if (timer) clearTimeout(timer);
  node.setAttribute("role", error ? "alert" : "status");
  node.classList.toggle("is-error", error);
  node.textContent = message;
  node.hidden = false;
  timer = setTimeout(
    () => {
      node!.hidden = true;
    },
    error ? 8000 : 2800,
  );
}
