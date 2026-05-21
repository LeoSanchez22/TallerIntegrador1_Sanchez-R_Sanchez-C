import { createBrowserRouter } from "react-router";
import { LandingPage } from "./components/LandingPage";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { PasswordRecovery } from "./components/PasswordRecovery";
import { DashboardLayout } from "./components/DashboardLayout";
import { Dashboard } from "./components/Dashboard";
import { Recommendations } from "./components/Recommendations";
import { Forecasting } from "./components/Forecasting";
import { Statistics } from "./components/Statistics";
import { DataPipeline } from "./components/DataPipeline";
import { Profile } from "./components/Profile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/recovery",
    Component: PasswordRecovery,
  },
  {
    path: "/app",
    Component: DashboardLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "recommendations", Component: Recommendations },
      { path: "forecasting", Component: Forecasting },
      { path: "statistics", Component: Statistics },
      { path: "pipeline", Component: DataPipeline },
      { path: "profile", Component: Profile },
    ],
  },
]);
