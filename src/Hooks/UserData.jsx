import { useQuery } from "@tanstack/react-query"; // Adjust the import according to your project structure
import user from "../Controllers/user";
import { GET } from "../Controllers/ApiControllers";

const getData = async () => {
  const res = await GET(`get_cart/user/${user.id}`);

  return res.data;
};

const useCartData = () => {
  const {
    isLoading: cartLoading,
    data: cartData,
    error: cartError,
  } = useQuery({
    queryKey: ["cartdata"],
    queryFn: getData,
  });

  return { cartData, cartLoading, cartError };
};

export default useCartData;
