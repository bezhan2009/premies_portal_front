const normalizeRole = (role) => {
  if (!role) {
    return role;
  }

  if (typeof role === "string") {
    return {
      Name: role,
      name: role,
      value: role,
      label: role,
    };
  }

  const roleName = role.Name ?? role.name ?? role.title ?? "";
  const roleId = role.ID ?? role.id ?? null;

  return {
    ...role,
    ...(roleId !== null ? { ID: roleId, id: roleId } : {}),
    Name: roleName,
    name: roleName,
  };
};

export const normalizeUser = (user) => {
  if (!user) {
    return user;
  }

  const id = user.ID ?? user.id ?? null;
  const username = user.Username ?? user.username ?? "";
  const roles = Array.isArray(user.roles) ? user.roles.map(normalizeRole) : [];

  return {
    ...user,
    ...(id !== null ? { ID: id, id } : {}),
    Username: username,
    username,
    full_name: user.full_name ?? user.FullName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    roles,
  };
};

export const normalizeWorker = (worker) => {
  if (!worker) {
    return worker;
  }

  const id = worker.ID ?? worker.id ?? null;
  const salary = worker.Salary ?? worker.salary ?? 0;

  return {
    ...worker,
    ...(id !== null ? { ID: id, id } : {}),
    Salary: salary,
    salary,
    user: normalizeUser(worker.user),
  };
};

export const normalizeOffice = (office) => {
  if (!office) {
    return office;
  }

  return {
    ...office,
    office_user: Array.isArray(office.office_user)
      ? office.office_user.map((item) => ({
          ...item,
          worker: normalizeWorker(item?.worker),
        }))
      : [],
  };
};

export const normalizeUsersResponse = (data) => ({
  ...data,
  users: Array.isArray(data?.users) ? data.users.map(normalizeUser) : [],
});
