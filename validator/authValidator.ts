export function loginValidator(email: string, password: string) {
    const errors: { email?: string; password?: string } = {};
  
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email) && !/^08\d{8,10}$/.test(email)) {
      errors.email = 'Masukkan email atau nomor telepon yang valid';
    }
  
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 8 characters";
    }
  
    return errors;
  }

export function signupValidator(form: any) {
  const errors: { [key: string]: string } = {};

  const { email, password, confirmPassword, idCard, company, phone, agree } = form;

  // Email validation
  if (!email) {
    errors.email = "Email wajib diisi";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "Masukkan email yang valid";
  }

  // Password validation
  if (!password) {
    errors.password = "Kata sandi wajib diisi";
  } else if (password.length < 8) {
    errors.password = "Kata sandi minimal 8 karakter";
  }

  // Confirm Password
  if (!confirmPassword) {
    errors.confirmPassword = "Konfirmasi kata sandi wajib diisi";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Kata sandi tidak cocok";
  }

  // ID Card
  if (!idCard) {
    errors.idCard = "Nomor Karyawan wajib diisi";
  }

  // Company
  if (!company) {
    errors.company = "Perusahaan harus dipilih";
  }

  // Phone
  if (!phone) {
    errors.phone = "Nomor telepon wajib diisi";
  } else if (!/^08\d{6,11}$/.test(phone)) {
    errors.phone = "Nomor telepon harus dimulai dengan 08 dan memiliki 8–13 digit";
  }

  return errors;
}

export function passwordSettingValidator(password: string, password_confirmation: string) {
    const errors: { password?: string; password_confirmation?: string } = {};
  
    if (!password) {
      //errors.password = "Password is required";
    } else if (password.length < 6) {
      //errors.password = "Password must be at least 6 characters";
    } 
  
    if (!password_confirmation) {
      //errors.password_confirmation = "Password is required";
    } else if (password_confirmation.length < 6) {
      //errors.password_confirmation = "Password must be at least 6 characters";
    } 
  
    return errors;
  }