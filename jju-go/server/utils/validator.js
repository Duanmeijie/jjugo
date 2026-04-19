const validateStudentId = (id) => {
  return /^\d{10}$/.test(id);
};

const validatePhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

const validatePassword = (pwd) => {
  return pwd && pwd.length >= 6 && pwd.length <= 20;
};

module.exports = { validateStudentId, validatePhone, validatePassword };