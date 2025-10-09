import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import { GET } from "../Controllers/ApiControllers";

const getData = async () => {
  const res = await GET(`get_configurations/group_name/Web`);
  return res.data;
};

const WebSetttings = () => {
  const {
    isLoading: webSetttingsLoading,
    data: webSetttingsData,
    error: webSetttingsError,
  } = useQuery({
    queryKey: ["web-settings"],
    queryFn: getData,
    staleTime: 0, // Data is considered stale immediately
    cacheTime: 0, // Cache will not be stored
    refetchOnWindowFocus: true, // Refetch when the window is focused
    refetchInterval: false, // Disable periodic refetching, set to a number if needed
  });

  return { webSetttingsLoading, webSetttingsData, webSetttingsError };
};

export default WebSetttings;
