import { getStorageJSON } from "../lib/storage";

const rawUser = getStorageJSON("user");

const resolveToken = (value) => {
	if (!value) return null;
	return (
		value.token ||
		value.api_token ||
		value.access_token ||
		value.accessToken ||
		value.data?.token ||
		null
	);
};

const resolveUserId = (value) => {
	if (!value) return null;
	return value.id || value.user_id || value.patient_id || value.data?.id || null;
};

const user = rawUser
	? {
			...rawUser,
			id: resolveUserId(rawUser),
			token: resolveToken(rawUser),
		}
	: null;

export default user;
