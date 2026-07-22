import { apiClient } from "../utils/apiClient";

export const fullUpdateWorkers = async (data) => {
    try {
        const workerId = data.ID ?? data.id;
        const payload = {
            salary: parseFloat(data.salary ?? data.Salary) || 0,
            position: data.position || "",
            place_work: data.place_work || "",
            user: {
                full_name: data.fio ?? data.full_name ?? data.user?.full_name ?? "",
                username: data.login ?? data.username ?? data.user?.username ?? "",
            },
        };

        const res = await apiClient.patch(`/workers/user/${workerId}`, payload);
        return res.data;
    } catch (e) {
        console.error(e);
        throw e;
    }
};
