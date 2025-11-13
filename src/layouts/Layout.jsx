import { Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";

import Header from "../components/Header";
import useIsMobile from "../hooks/useIsMobile";
import LoadingScreen from "../components/Loading";

const Layout = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const hideButton = location.pathname.startsWith("/post");
  const showHeaderOnMobile = ["/", "/list"];
  const shouldShowHeader =
    !isMobile || showHeaderOnMobile.includes(location.pathname);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="layout">
        {shouldShowHeader && <Header hideButton={hideButton} />}
        <main className="container">
          <Outlet />
        </main>
      </div>
    </Suspense>
  );
};

export default Layout;
