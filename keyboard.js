class Keyboard {
  /**
   * @param {HTMLFormElement} formElement O elemento do formulário que contém os inputs.
   * @param {HTMLElement} alfanumericoContainer O container para o teclado alfanumérico.
   * @param {HTMLElement} numericoContainer O container para o teclado numérico.
   */
  constructor(formElement, alfanumericoContainer, numericoContainer) {
    if (!formElement || !alfanumericoContainer || !numericoContainer) {
      throw new Error("Keyboard requires a form and container elements.");
    }

    this.form = formElement;
    this.alfanumericoContainer = alfanumericoContainer;
    this.numericoContainer = numericoContainer;
    this.activeInput = null;

    this._init();
  }

  /**
   * Inicializa o teclado, criando os layouts e anexando os listeners.
   */
  _init() {
    this._createLayouts();
    this._attachInputListeners();
  }

  /**
   * Constrói os layouts de teclado alfanumérico e numérico.
   */
  _createLayouts() {
    const layoutAlfanumerico = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '←'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
      ['espaço'],
    ];
    const layoutNumerico = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['placeholder', '0', '←'],
    ];

    this._buildKeyboardDOM(this.alfanumericoContainer, layoutAlfanumerico);
    this._buildKeyboardDOM(this.numericoContainer, layoutNumerico);
  }

  /**
   * Gera o DOM para um layout de teclado específico.
   * @param {HTMLElement} container O elemento onde o teclado será inserido.
   * @param {string[][]} layout A matriz que define o layout das teclas.
   */
  _buildKeyboardDOM(container, layout) {
    const fragment = document.createDocumentFragment();

    layout.forEach(linha => {
      const divLinha = document.createElement('div');
      divLinha.className = 'linha-teclado';
      linha.forEach(tecla => {
        // Adiciona um espaço reservado invisível para alinhar as teclas
        if (tecla === 'placeholder') {
          const placeholder = document.createElement('div');
          placeholder.className = 'tecla';
          placeholder.style.visibility = 'hidden';
          divLinha.appendChild(placeholder);
          return;
        }
        const btn = document.createElement('button');
        btn.className = 'tecla';
        btn.textContent = tecla;
        btn.type = 'button'; // Evita submissão do formulário

        if (tecla === 'espaço') {
          btn.id = 'tecla-espaco';
          btn.classList.add('tecla-especial');
        }
        if (tecla === '←') btn.classList.add('tecla-func');

        btn.addEventListener('click', () => this._handleKeyPress(tecla));
        divLinha.appendChild(btn);
      });
      fragment.appendChild(divLinha);
    });

    container.innerHTML = ''; // Limpa o container
    container.appendChild(fragment); // Adiciona tudo de uma vez
  }

  /**
   * Adiciona listeners de 'focus' aos inputs do formulário.
   */
  _attachInputListeners() {
    this.form.querySelectorAll('input[type="text"], input[type="tel"]').forEach(input => {
      const setActive = (target) => {
        this.form.querySelectorAll('input').forEach(el => el.classList.remove('input-active'));
        target.classList.add('input-active');
        this.activeInput = target;
      };

      input.addEventListener('focus', (e) => {
        setActive(e.target);
        const isNumeric = this.activeInput.id === 'telefone' || this.activeInput.id === 'cpf';
        this.alfanumericoContainer.style.display = isNumeric ? 'none' : 'flex';
        this.numericoContainer.style.display = isNumeric ? 'flex' : 'none';
      });
    });
  }

  /**
   * Lida com o clique em uma tecla do teclado virtual.
   * @param {string} tecla O caractere da tecla pressionada.
   */
  _handleKeyPress(tecla) {
    if (!this.activeInput) return;

    const inputId = this.activeInput.id;
    let currentValue = this.activeInput.value;

    if (tecla === '←') {
      currentValue = currentValue.slice(0, -1);
    } else {
      const valor = (tecla === 'espaço') ? ' ' : tecla;
      // Adiciona o valor apenas se não for um campo numérico com comprimento máximo de dígitos atingido
      const currentDigits = currentValue.replace(/\D/g, '').length;
      if (!((inputId === 'cpf' || inputId === 'telefone') && currentDigits >= 11)) {
        currentValue += valor;
      }
    }

    if (inputId === 'cpf') {
      this.activeInput.value = this._formatCPF(currentValue);
    } else if (inputId === 'telefone') {
      this.activeInput.value = this._formatTelefone(currentValue);
    } else {
      this.activeInput.value = currentValue;
    }
  }

  /**
   * Formata um valor como CPF (XXX.XXX.XXX-XX).
   * @param {string} value O valor a ser formatado.
   * @returns {string} O valor formatado.
   */
  _formatCPF(value) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
  }

  /**
   * Formata um valor como telefone ((XX) XXXXX-XXXX).
   * @param {string} value O valor a ser formatado.
   * @returns {string} O valor formatado.
   */
  _formatTelefone(value) {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  }
}
