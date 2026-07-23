import { Outlet } from "react-router-dom";
import Header from "../../header/ui/Header";

export default function AppLayout() {
  return (
    <div className="app-frame d-flex flex-column min-vh-100">
      <Header />
      <main className="container-fluid app-shell page-content flex-grow-1">
        <Outlet />
      </main>
    </div>
  );
}
