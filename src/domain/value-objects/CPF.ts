export class CPF {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): CPF {
    if (!value) {
      throw new Error('CPF é obrigatório');
    }

    const cleanCPF = value.replace(/[^\d]/g, '');

    if (!CPF.validate(cleanCPF)) {
      throw new Error('CPF inválido');
    }

    // Format CPF as 000.000.000-00
    const formatted = `${cleanCPF.substring(0, 3)}.${cleanCPF.substring(3, 6)}.${cleanCPF.substring(6, 9)}-${cleanCPF.substring(9, 11)}`;
    return new CPF(formatted);
  }

  public getValue(): string {
    return this.value;
  }

  private static validate(cpf: string): boolean {
    if (cpf.length !== 11) return false;

    // Check for repetitive digit patterns
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validate 1st digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;

    // Validate 2nd digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;

    return true;
  }
}
