const validateStudentId = (id) => {
  return /^\d{11}$/.test(id);
};

const validatePhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

const validatePassword = (pwd) => {
  return /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{3,15}$/.test(pwd);
};

const validateNickname = (nickname) => {
  return /^[\u4e00-\u9fa5a-zA-Z0-9]{1,20}$/.test(nickname);
};

module.exports = { validateStudentId, validatePhone, validatePassword, validateNickname };