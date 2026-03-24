# Atualização de Design: Alteração da Fonte Principal

Nesta atualização, a fonte padrão utilizada na geração da documentação automatizada foi alterada de **Inter** para **Figtree**.

## O que foi alterado:

1.  **Carregamento de Fontes (`loadFonts`):** 
    - A função agora carrega a família `Figtree` com os estilos `Regular`, `Medium` e `Bold`.
    - Isso garante que o Figma disponibilize os pesos necessários antes de tentar criar os textos.

2.  **Criação de Textos Genéricos (`createText`):**
    - A função base responsável por criar a maioria dos textos da documentação agora utiliza `family: 'Figtree'` por padrão.

3.  **Chips de Tokens (`renderTokens`):**
    - A fonte utilizada na renderização dos nomes e valores dos tokens dentro dos chips (Labels) também foi atualizada para manter a consistência visual.

4.  **Correção de Ordem de Atribuição:**
    - Foi corrigido um erro onde os caracteres eram definidos antes da fonte ser atribuída (`set_characters before loadFont`). Agora, a fonte `Figtree` é definida **antes** do conteúdo do texto.
    - Adicionado suporte ao carregamento de `Inter Regular` como fallback de segurança, prevenindo erros ao manipular componentes que utilizem a fonte padrão do sistema Figma.

## Como testar:

1.  Selecione um componente no Figma.
2.  Inicie o plugin e gere a documentação.
3.  Verifique se os textos criados agora utilizam a fonte **Figtree**.

---
*Nota: Certifique-se de que a fonte Figtree está instalada no seu sistema ou disponível na sua organização do Figma para evitar erros de fonte ausente.*
