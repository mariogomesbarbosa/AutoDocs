async function generateDocumentation() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.notify("Por favor, selecione um Componente, Conjunto de Componentes ou Instância.");
    figma.closePlugin();
    return;
  }

  const node = selection[0];

  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET' && node.type !== 'INSTANCE') {
    figma.notify("O item selecionado não é um Componente ou Instância.");
    figma.closePlugin();
    return;
  }

  // Carregar fontes necessárias
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  // Criar Frame Principal (Container da Documentação)
  const docFrame = figma.createFrame();
  docFrame.name = `Docs - ${node.name}`;
  docFrame.layoutMode = "VERTICAL";
  docFrame.primaryAxisSizingMode = "AUTO";
  docFrame.counterAxisSizingMode = "FIXED";
  docFrame.resize(1000, 100); // 1000px de largura fixa, altura auto
  docFrame.fills = [figma.util.solidPaint("#F5F5F5")]; // Fundo cinza claro
  docFrame.paddingTop = 60;
  docFrame.paddingBottom = 60;
  docFrame.paddingLeft = 60;
  docFrame.paddingRight = 60;
  docFrame.itemSpacing = 40;

  // Adicionar Título Principal
  const title = figma.createText();
  title.characters = node.name;
  title.fontSize = 32;
  title.fontName = { family: "Inter", style: "Bold" };
  title.fills = [figma.util.solidPaint("#1A1A1A")];
  docFrame.appendChild(title);

  // Adicionar Seção "Sobre"
  const sectionSobre = createSectionFrame("Sobre");
  const descriptionText = (node as any).description
    ? (node as any).description
    : "Descrição não fornecida no componente Figma. Use o painel direito do Figma para adicionar uma descrição ao componente principal.";

  const textSobre = figma.createText();
  textSobre.characters = descriptionText;
  textSobre.fontSize = 16;
  textSobre.fontName = { family: "Inter", style: "Regular" };
  textSobre.fills = [figma.util.solidPaint("#333333")];
  textSobre.layoutAlign = "STRETCH"; // Ocupar largura pai

  sectionSobre.appendChild(textSobre);
  docFrame.appendChild(sectionSobre);

  // Adicionar Seção "Estrutura"
  const sectionEstrutura = createSectionFrame("Estrutura");

  // Container horizontal para Propriedades e Preview
  const estruturaContent = figma.createFrame();
  estruturaContent.name = "Conteúdo";
  estruturaContent.fills = [];
  estruturaContent.layoutMode = "HORIZONTAL";
  estruturaContent.layoutAlign = "STRETCH";
  (estruturaContent as FrameNode).primaryAxisSizingMode = "FIXED";
  (estruturaContent as FrameNode).counterAxisSizingMode = "AUTO";
  estruturaContent.itemSpacing = 20;

  // Lado Esquerdo - Propriedades (Card Branco)
  const propsFrame = figma.createFrame();
  propsFrame.name = "Propriedades";
  propsFrame.fills = [figma.util.solidPaint("#FFFFFF")];
  propsFrame.cornerRadius = 8;
  propsFrame.layoutMode = "VERTICAL";
  propsFrame.layoutGrow = 1; // Divide espaço com o preview
  propsFrame.paddingTop = 40;
  propsFrame.paddingBottom = 40;
  propsFrame.paddingLeft = 40;
  propsFrame.paddingRight = 40;
  propsFrame.itemSpacing = 24;

  const propsText = figma.createText();
  propsText.characters = extrairPropriedadesBasicas(node);
  propsText.fontSize = 14;
  propsText.fontName = { family: "Inter", style: "Regular" };
  propsText.lineHeight = { value: 150, unit: "PERCENT" };
  propsText.fills = [figma.util.solidPaint("#333333")];
  propsFrame.appendChild(propsText);

  // Lado Direito - Preview (Card Branco)
  const previewFrame = figma.createFrame();
  previewFrame.name = "Preview";
  previewFrame.fills = [figma.util.solidPaint("#FFFFFF")];
  previewFrame.cornerRadius = 8;
  previewFrame.layoutMode = "VERTICAL";
  previewFrame.layoutGrow = 1;
  previewFrame.primaryAxisAlignItems = "CENTER"; // Centraliza preview vertical
  previewFrame.counterAxisAlignItems = "CENTER"; // Centraliza preview horizontal
  previewFrame.paddingTop = 60;
  previewFrame.paddingBottom = 60;
  previewFrame.paddingLeft = 60;
  previewFrame.paddingRight = 60;

  // Clonar Componente para o Preview
  let clone;
  if (node.type === 'COMPONENT_SET') {
    // Se for um ComponentSet, pego o primeiro componente dele
    clone = node.defaultVariant.createInstance();
  } else if (node.type === 'COMPONENT') {
    clone = node.createInstance();
  } else {
    // Instância
    clone = node.clone();
  }

  previewFrame.appendChild(clone);

  // Adicionar lados ao container "Estrutura"
  estruturaContent.appendChild(propsFrame);
  estruturaContent.appendChild(previewFrame);

  sectionEstrutura.appendChild(estruturaContent);
  docFrame.appendChild(sectionEstrutura);

  // NOVIDADE: GERAR "ESTADOS" E "VARIANTES"
  if (node.type === 'COMPONENT_SET') {
    const compSet = node as ComponentSetNode;
    const propriedades = compSet.componentPropertyDefinitions;

    // Arrays para guardar as propriedades classificadas
    const propsEstado: string[] = [];
    const propsVariante: string[] = [];

    // Palavras-chave que inferem um estado (adicionar em PT e EN)
    const keywordsEstado = ['state', 'estado', 'hover', 'pressed', 'active', 'disabled', 'focus'];

    for (const key in propriedades) {
      if (propriedades[key].type === 'VARIANT') {
        const cleanKey = key.split('#')[0].toLowerCase();
        // Verificar se é Estado ou Variante
        const isEstado = keywordsEstado.some(keyword => cleanKey.includes(keyword));
        if (isEstado) {
          propsEstado.push(key);
        } else {
          propsVariante.push(key);
        }
      }
    }

    // Função auxiliar para renderizar uma seção de variantes (Seja Estado ou não)
    const renderVariantesSection = (title: string, propKeys: string[]) => {
      const section = createSectionFrame(title);
      let adicionouConteudo = false;

      propKeys.forEach(propKey => {
        const cleanKey = propKey.split('#')[0];
        const defaultValue = propriedades[propKey].defaultValue;
        // As opções válidas para esta propriedade
        const options = propriedades[propKey].variantOptions || [];

        options.forEach(optionStr => {
          // Só desenhar variações que não sejam o padrão/default (Pois a default já está na 'Estrutura')
          if (optionStr !== defaultValue && optionStr.toLowerCase() !== 'default') {
            adicionouConteudo = true;

            // Subtítulo (Nome da opção. ex: "Hover" ou "Small")
            const titleRow = figma.createText();
            titleRow.characters = optionStr;
            titleRow.fontSize = 14;
            titleRow.fontName = { family: "Inter", style: "Bold" };
            titleRow.fills = [figma.util.solidPaint("#1A1A1A")];
            // titleRow.paddingBottom = 8;

            section.appendChild(titleRow);

            // Container Horizontal de conteúdo (idêntico ao de Estrutura)
            const rowContent = figma.createFrame();
            rowContent.name = `Conteudo-${optionStr}`;
            rowContent.fills = [];
            rowContent.layoutMode = "HORIZONTAL";
            rowContent.layoutAlign = "STRETCH";
            (rowContent as FrameNode).primaryAxisSizingMode = "FIXED";
            (rowContent as FrameNode).counterAxisSizingMode = "AUTO";
            rowContent.itemSpacing = 20;

            // Encontrar o componente filho (variante) dentro do Set que corresponda
            // a ter esta propriedade === optionStr
            const varianteTarget = compSet.children.find(child => {
              if (child.type === 'COMPONENT') {
                const childProps = (child as any).componentPropertyReferences || {};
                // O nome do componente variante no figma é ex: "State=Hover, Size=Medium"
                // Parse simplificado buscando o valor exato no nome (isso cobre grande parte dos casos default do figma)
                return child.name.includes(`${cleanKey}=${optionStr}`);
              }
              return false;
            });

            // Card Esquerdo (Props)
            const paramFrame = figma.createFrame();
            paramFrame.name = "Propriedades";
            paramFrame.fills = [figma.util.solidPaint("#FFFFFF")];
            paramFrame.cornerRadius = 8;
            paramFrame.layoutMode = "VERTICAL";
            paramFrame.layoutGrow = 1;
            paramFrame.paddingTop = 24;
            paramFrame.paddingBottom = 24;
            paramFrame.paddingLeft = 24;
            paramFrame.paddingRight = 24;

            const paramText = figma.createText();
            // Se encontrou a variante específica, extraimos dados dela
            paramText.characters = varianteTarget
              ? extrairPropriedadesBasicas(varianteTarget)
              : `Propriedade ${cleanKey}: ${optionStr}`;
            paramText.fontSize = 12;
            paramText.fontName = { family: "Inter", style: "Regular" };
            paramText.fills = [figma.util.solidPaint("#333333")];
            paramFrame.appendChild(paramText);

            // Card Direito (Preview)
            const prevFrame = figma.createFrame();
            // Mesmas propriedades do PreviewFrame original
            prevFrame.name = "Preview";
            prevFrame.fills = [figma.util.solidPaint("#FFFFFF")];
            prevFrame.cornerRadius = 8;
            prevFrame.layoutMode = "VERTICAL";
            prevFrame.layoutGrow = 1;
            prevFrame.primaryAxisAlignItems = "CENTER";
            prevFrame.counterAxisAlignItems = "CENTER";
            prevFrame.paddingTop = 40;
            prevFrame.paddingBottom = 40;
            prevFrame.paddingLeft = 40;
            prevFrame.paddingRight = 40;

            if (varianteTarget && varianteTarget.type === 'COMPONENT') {
              prevFrame.appendChild(varianteTarget.createInstance());
            } else {
              // Fallback se não der match perfeito
              const fallbackText = figma.createText();
              fallbackText.characters = "Pré-visualização não encontrada.";
              fallbackText.fontSize = 12;
              prevFrame.appendChild(fallbackText);
            }

            rowContent.appendChild(paramFrame);
            rowContent.appendChild(prevFrame);

            section.appendChild(rowContent);

            if ('layoutSizingHorizontal' in rowContent) {
              (rowContent as any).layoutSizingHorizontal = "FILL";
            }
          }
        });
      });

      if (adicionouConteudo) {
        docFrame.appendChild(section);
      }
    };

    // Renderizar Estados
    if (propsEstado.length > 0) {
      renderVariantesSection("Estados", propsEstado);
    }

    // Renderizar Outras Variantes
    if (propsVariante.length > 0) {
      renderVariantesSection("Variantes", propsVariante);
    }
  }

  // Posicionar ao lado do nó selecionado
  docFrame.x = node.x + node.width + 100;
  docFrame.y = node.y;

  if ('layoutSizingHorizontal' in estruturaContent) {
    (estruturaContent as any).layoutSizingHorizontal = "FILL";
  }

  figma.currentPage.appendChild(docFrame);
  figma.currentPage.selection = [docFrame];
  figma.viewport.scrollAndZoomIntoView([docFrame]);

  figma.closePlugin();
}

/**
 * Cria um frame comum de seção com título e linha divisória
 */
function createSectionFrame(titleText: string): FrameNode {
  const section = figma.createFrame();
  section.name = `Seção - ${titleText}`;
  section.layoutMode = "VERTICAL";
  section.layoutAlign = "STRETCH"; // Ocupa largura do pai
  section.primaryAxisSizingMode = "AUTO";
  section.counterAxisSizingMode = "AUTO";
  section.fills = []; // Transparente
  section.itemSpacing = 20;

  // Título da Seção
  const title = figma.createText();
  title.characters = titleText;
  title.fontSize = 20;
  title.fontName = { family: "Inter", style: "Bold" };
  title.fills = [figma.util.solidPaint("#1A1A1A")];
  section.appendChild(title);

  // Linha divisória
  const divider = figma.createLine();
  divider.layoutAlign = "STRETCH";
  divider.strokes = [figma.util.solidPaint("#D9D9D9")];
  divider.strokeWeight = 1;
  section.appendChild(divider);

  return section;
}

/**
 * Extrai propriedades básicas de um nó para exibir como texto.
 * Em fases futuras, leremos tokens e inspecionaremos filhos (icon, label, etc).
 */
function extrairPropriedadesBasicas(node: SceneNode): string {
  let props = `📌 Estrutura do Nó Selecionado:\n\n`;

  props += `Tamanho:\n`;
  props += `- Largura: ${node.width}px\n`;
  props += `- Altura: ${node.height}px\n\n`;

  if ('layoutMode' in node && node.layoutMode !== "NONE") {
    props += `Auto Layout:\n`;
    props += `- Direção: ${node.layoutMode}\n`;
    if ('paddingTop' in node) props += `- Padding: ${node.paddingTop}px (C) / ${node.paddingBottom}px (B) / ${node.paddingLeft}px (E) / ${node.paddingRight}px (D)\n`;
    if ('itemSpacing' in node) props += `- Espaçamento: ${node.itemSpacing}px\n`;
    props += `\n`;
  }

  if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
    props += `Estilos:\n`;
    props += `- Border Radius: ${node.cornerRadius}px\n`;
  } else if ('cornerRadius' in node && node.cornerRadius === figma.mixed) {
    props += `Estilos:\n`;
    props += `- Border Radius: Variado (Mixed)\n`;
  }

  // Verificar se o nó possui propriedades de componente
  if ('componentProperties' in node) {
    const cmpPropsStr = JSON.stringify(node.componentProperties, null, 2);
    if (cmpPropsStr !== "{}") {
      props += `\nPropriedades do Componente:\n`;
      const cProps = (node as any).componentProperties;
      for (const key in cProps) {
        // Figma adiciona ids às chaves (ex: "Size#123"). Limpar string:
        const cleanKey = key.split('#')[0];
        props += `- ${cleanKey}: ${cProps[key].value}\n`;
      }
    }
  }

  return props;
}

generateDocumentation();
