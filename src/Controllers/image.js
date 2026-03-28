import apiAddress from "./apiAddress";
const imageBaseURL = `${apiAddress}/storage`;
if (typeof window !== "undefined") {
  console.debug("[Image Controller] Resolved imageBaseURL:", {
    apiAddress,
    imageBaseURL,
    location: window.location.href,
  });
}
export default imageBaseURL;
