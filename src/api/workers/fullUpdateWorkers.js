import { apiClient } from "../utils/apiClient";

export const fullUpdateWorkers = async (data) => {
    try {
        const payload = {
            salary: parseFloat(data.salary) || 0,
            position: data.position || "",
            place_work: data.place_work || "",
            user: {
                full_name: data.fio || "",
                username: data.login || "",
            },
        };

        const res = await apiClient.patch(`/workers/user/${data.ID}`, payload);
        return res.data;
    } catch (e) {
        console.error(e);
        throw e;
    }
};