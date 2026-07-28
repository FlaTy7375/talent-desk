export function buildNavItems(t) {
  return [
    { to: "/", label: t("nav.home"), icon: "bi-grid-1x2", end: true },
    { to: "/positions", label: t("nav.positions"), icon: "bi-briefcase" },
  ];
}

export function buildManageItems(t, user) {
  const manageItems = [];
  if (user && (user.role === "RECRUITER" || user.role === "ADMIN")) {
    manageItems.push({
      to: "/attributes",
      label: t("nav.attributes"),
      icon: "bi-sliders2",
    });
  }
  if (user?.role === "ADMIN") {
    manageItems.push({
      to: "/admin/users",
      label: t("nav.users"),
      icon: "bi-people",
    });
  }
  return manageItems;
}
