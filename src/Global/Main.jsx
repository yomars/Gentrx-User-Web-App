import { lazy, startTransition, Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import Footer from "./Foorter";
import Loading from "../Components/Loading";
import { NotFoundPage } from "../Pages/NotFoundPage";
import imageBaseURL from "../Controllers/image";
import TopbarNew from "./TopbarNew";
import StripePaymentProcess from "../Pages/StripePaymentProcess";
import ContactMarqee from "../Components/ContactMarqee";
import useSettingsData from "../Hooks/SettingData";

// Lazy load the components
const HomePage = lazy(() => import("../Pages/HomePage"));
const Doctors = lazy(() => import("../Pages/Doctors"));
const Doctor = lazy(() => import("../Pages/Doctor"));
const NewAppointment = lazy(() => import("../Pages/NewAppoinment"));
const Department = lazy(() => import("../Pages/Department"));
const AppointmentSuccess = lazy(() => import("../Pages/AppoinmentSuccess"));
const LabTests = lazy(() => import("../Pages/LabTests"));
const NewAppoinmentsByDoctor = lazy(() =>
  import("../Pages/NewAppoinmentsByDoctor")
);
const LabTestDetails = lazy(() => import("../Pages/LabTestDetails"));
const Appointments = lazy(() => import("../Pages/Appoinments"));
const AppointmentDetails = lazy(() => import("../Pages/AppointmentDetails"));
const Cart = lazy(() => import("../Pages/Cart"));
const Products = lazy(() => import("../Pages/Products"));
const ProductDetails = lazy(() => import("../Pages/ProductDetails"));
const Orders = lazy(() => import("../Pages/Orders"));
const OrderDetails = lazy(() => import("../Pages/OrderDetails"));
const Profile = lazy(() => import("../Pages/Profile"));
const Login = lazy(() => import("../Pages/Login"));
const Vitals = lazy(() => import("../Pages/Vitals"));
const Files = lazy(() => import("../Pages/Files"));
const Prescriptions = lazy(() => import("../Pages/Prescriptions"));
const Webpage = lazy(() => import("../Pages/WebPages/Webpage"));
const FamilyMember = lazy(() => import("../Pages/FamilyMember/FamilyMember"));
const Signup = lazy(() => import("../Pages/Signup"));
const FamilyMembers = lazy(() => import("../Components/FamilyMembers"));
const BloodPressure = lazy(() => import("../Pages/Vitals/BloodPressure"));
const ContactUs = lazy(() => import("../Pages/ContactUs"));
const ErrorPage = lazy(() => import("../Pages/ErrorPage"));
const TechnicalError = lazy(() => import("../Pages/TechnicalIssue"));
const Search = lazy(() => import("../Pages/SearchPage"));
const Clinic = lazy(() => import("../Pages/Clinic"));
const Clinics = lazy(() => import("../Pages/Clinics"));

export default function Main() {
  const location = useLocation();
  const { settingsData, settingsLoading, settingsError } = useSettingsData();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const faviconItem = settingsData?.find(
      (value) => value.id_name === "fav_icon"
    );
    const title = settingsData?.find(
      (value) => value.id_name === "clinic_name"
    );

    startTransition(() => {
      document.title = title?.value || "document";

      // Change the favicon
      const favicon =
        document.querySelector('link[rel="icon"]') ||
        document.createElement("link");
      favicon.type = "image/x-icon";
      favicon.rel = "icon";
      favicon.href = `${imageBaseURL}/${faviconItem?.value}`;
      document.getElementsByTagName("head")[0].appendChild(favicon);
    });
  }, [settingsData]);

  const web_technical_issue = settingsData?.find(
    (value) => value.id_name === "web_technical_issue_enable"
  );

  if (settingsLoading) return <Loading />;
  if (!settingsData || settingsError) return <ErrorPage />;

  return (
    <div>
      {web_technical_issue?.value === "true" ? (
        <Suspense fallback={<Loading />}>
          {" "}
          <TechnicalError />
        </Suspense>
      ) : (
        <>
          <ContactMarqee />
          <TopbarNew />
          <Box pb={20}>
            {" "}
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/doctors" element={<Doctors />} />
                <Route path="/doctor/:id" element={<Doctor />} />
                <Route path="/book-appointment" element={<NewAppointment />} />
                <Route
                  path="/book-appointment/:doctor/:appoinType"
                  element={<NewAppoinmentsByDoctor />}
                />
                <Route
                  path="/appointment-success/:id"
                  element={<AppointmentSuccess />}
                />
                {/* department */}
                <Route path="/department/:name/:id" element={<Department />} />
                {/* labs */}
                <Route path="/lab-tests" element={<LabTests />} />{" "}
                <Route path="/lab-test/:id" element={<LabTestDetails />} />
                {/* appointments */}
                <Route path="/appointments" element={<Appointments />} />
                <Route
                  path="/appointment/:id"
                  element={<AppointmentDetails />}
                />
                {/* cart */}
                <Route path="/cart" element={<Cart />} />
                {/* Products */}
                <Route path="/products" element={<Products />} />
                <Route path="/product/:name/:id" element={<ProductDetails />} />
                {/* vitals */}
                <Route path="/vitals" element={<Vitals />} />
                <Route
                  path="/vitals/blood-pressure"
                  element={<BloodPressure />}
                />
                <Route path="/vitals/blood-sugar" element={<Vitals />} />
                <Route path="/vitals/weight" element={<Vitals />} />
                <Route path="/vitals/temperature" element={<Vitals />} />
                <Route path="/vitals/spo2" element={<Vitals />} />
                {/* orders */}
                <Route path="/orders" element={<Orders />} />
                <Route path="/order/:id" element={<OrderDetails />} />
                {/* not found */}
                <Route path="/profile" element={<Profile />} />
                {/* family */}
                <Route path="/family-members" element={<FamilyMembers />} />
                <Route path="/family-member/:id" element={<FamilyMember />} />
                <Route path="*" element={<NotFoundPage />} />
                {/* login signup */}
                <Route path="/Login" element={<Login relode={true} />} />
                <Route path="/signup" element={<Signup relode={true} />} />
                <Route path="/contact-us" element={<ContactUs />} />
                <Route path="/files" element={<Files />} />
                <Route path="/prescriptions" element={<Prescriptions />} />
                {/* stripe payment wallet */}
                <Route
                  path="/stripe-payment"
                  element={<StripePaymentProcess />}
                />
                {/*web pages */}
                <Route path="/about-us" element={<Webpage id={1} />} />
                <Route path="/privacy-policy" element={<Webpage id={2} />} />
                <Route
                  path="/terms-and-conditions"
                  element={<Webpage id={3} />}
                />
                <Route path="/payment-policy" element={<Webpage id={4} />} />
                <Route path="/legal" element={<Webpage id={5} />} />
                <Route path="/search" element={<Search />} />
                <Route path="/clinics" element={<Clinics />} />
                <Route path="/clinic/:name/:id" element={<Clinic />} />
              </Routes>
            </Suspense>
          </Box>
          <Box>
            <Footer />
          </Box>
        </>
      )}
    </div>
  );
}
