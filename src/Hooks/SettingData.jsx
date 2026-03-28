import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import { GET } from "../Controllers/ApiControllers";

const getData = async () => {
  const res = await GET(`get_configurations`);
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
};

const useSettingsData = () => {
  const {
    isLoading: settingsLoading,
    data: settingsData,
    error: settingsError,
  } = useQuery({
    queryKey: ["settings"],
    queryFn: getData,
    retry: 1,
  });
  return { settingsData, settingsLoading, settingsError };
};

export default useSettingsData;
