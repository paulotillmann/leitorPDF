# Identidade Visual e Design System - Salvy

Este arquivo serve como uma **Skill Local** documentando a identidade visual, padrões de UX/UI, paleta de cores, tipografia, elevação e transições da plataforma **Salvy**. Utilize estas especificações para manter consistência visual e construir componentes fiéis à marca.

---

## 1. Conceito e Estilo Visual

A interface da Salvy adota um estilo **NeoTelco B2B moderno e limpo**, misturando elementos minimalistas de SaaS de alta performance com sutis toques de **Neumorfismo Suave** (especialmente visível nas sombras e botões).

### Princípios de Design:
- **Alta Legibilidade:** Foco total no conteúdo de dados e gestão.
- **Modo Escuro Nativo:** Suporte duplo de temas (Light/Dark) onde os valores das variáveis são invertidos de forma semântica.
- **Micro-interações Suaves:** Transições calculadas para todas as ações do usuário.
- **Bordas Arredondadas Geométricas:** Uso consistente de raios de curvatura variados (`--radius-`).

---

## 2. Paleta de Cores Semântica (Tailwind CSS v4)

As cores são estruturadas em escalas semânticas de `0` a `900`. 
No tema escuro (`.dark` ou `body[data-theme=dark]`), a escala de cores de **Brand** e **Gray** é semanticamente invertida (ex: `brand-50` torna-se escuro e `brand-900` torna-se claro).

### Paletas Comparativas:

| Variável | Light Mode (Default) | Dark Mode (`.dark`) |
| :--- | :--- | :--- |
| **Monocromáticas** | | |
| `--color-white` | `#ffffff` | `#232323` |
| `--color-black` | `#181410` | `#ffffff` |
| **Brand (Warm Beige / Deep Brown)** | | |
| `--color-brand-0` | `#ffffff` | `#000000` |
| `--color-brand-50` | `#fbfaf9` (Warm White/Cream) | `#181410` (Almost Black) |
| `--color-brand-100` | `#f7f5f2` | `#372d23` |
| `--color-brand-200` | `#f4f2ee` | `#534a3d` |
| `--color-brand-300` | `#ede9e2` | `#7e7261` |
| `--color-brand-400` | `#ddd5c8` | `#c3b5a0` |
| `--color-brand-500` | `#c3b5a0` | `#ddd5c8` |
| `--color-brand-600` | `#7e7261` | `#ede9e2` |
| `--color-brand-700` | `#534a3d` | `#f4f2ee` |
| `--color-brand-800` | `#372d23` (Deep Brown) | `#f7f5f2` |
| `--color-brand-900` | `#181410` | `#ffffff` |
| **Gray (Neutral Gray)** | | |
| `--color-gray-0` | `#ffffff` | `#000000` |
| `--color-gray-50` | `#f9f9f9` | `#141414` |
| `--color-gray-100` | `#efefef` | `#232323` |
| `--color-gray-200` | `#dad8d8` | `#373737` |
| `--color-gray-300` | `#cbcbcb` | `#4f4a4a` |
| `--color-gray-400` | `#a8a3a3` | `#807a7a` |
| `--color-gray-500` | `#807a7a` | `#a8a3a3` |
| `--color-gray-600` | `#4f4a4a` | `#cbcbcb` |
| `--color-gray-700` | `#373737` | `#dad8d8` |
| `--color-gray-800` | `#232323` | `#efefef` |
| `--color-gray-900` | `#141414` | `#f9f9f9` |
| **Blue (Corporate Accent)** | | |
| `--color-blue-0` | `#ecf2f9` | `#0d2035` |
| `--color-blue-50` | `#e4ecf6` | `#112a46` |
| `--color-blue-100` | `#d9e4f2` | `#203f60` |
| `--color-blue-200` | `#c2d6eb` | `#2f5d8d` |
| `--color-blue-300` | `#9ebfe1` | `#538bc5` |
| `--color-blue-400` | `#88afd7` | `#88afd7` |
| `--color-blue-500` | `#538bc5` | `#9ebfe1` |
| `--color-blue-600` | `#2f5d8d` | `#c2d6eb` |
| `--color-blue-700` | `#203f60` | `#d9e4f2` |
| `--color-blue-800` | `#112a46` | `#eaecf6` |
| `--color-blue-900` | `#0d2035` | `#ecf2f9` |
| **Suporte e Estados** | | |
| `--color-green-500` (Success) | `#4b9b4e` | `#adcda2` |
| `--color-red-500` (Error) | `#be3739` | `#ec9395` |
| `--color-yellow-500` (Warning) | `#ce9e24` | `#e9d996` |
| `--color-teal-500` (Info) | `#40bfa9` | `#addcd4` |

---

## 3. Tipografia e Escala de Texto

A Salvy utiliza três famílias tipográficas com propósitos distintos:

1. **`Poppins` (Display):** Títulos, cabeçalhos de destaque e logo.
2. **`Inter` (Sans-serif):** Interface principal, menus, labels, inputs e corpo de texto.
3. **`JetBrains Mono` (Monospace):** Código de eSIM, consumo de dados móveis, números de telefone, tabelas numéricas.

### Escala de Tamanhos de Fonte:
- `--text-display-2xl`: `3.75rem` (Linha: `1.5`)
- `--text-display-xl`: `3.375rem` (Linha: `1.5`)
- `--text-display-lg`: `3.00rem` (Linha: `1.5`)
- `--text-display-md`: `2.625rem` (Linha: `1.5`)
- `--text-display-sm`: `2.25rem` (Linha: `1.5`)
- `--text-display-xs`: `2.00rem` (Linha: `1.5`)
- `--text-4xl`: `2.25rem` (Linha: `1.11`)
- `--text-3xl`: `1.875rem` (Linha: `1.2`)
- `--text-2xl`: `1.50rem` (Linha: `1.5`)
- `--text-xl`: `1.25rem` (Linha: `1.5`)
- `--text-lg`: `1.125rem` (Linha: `1.5`)
- `--text-md` / `--text-base`: `1.00rem` (Linha: `1.5`)
- `--text-sm`: `0.875rem` (Linha: `1.5`)
- `--text-xs`: `0.75rem` (Linha: `1.5`)
- `--text-2xs`: `0.625rem` (Linha: `1.5`)

---

## 4. Elevação e Sombras Neumórficas

As sombras na Salvy dão um relevo tridimensional sutil sobre o fundo. Elas combinam uma sombra branca projetada para cima à esquerda (luz) com uma sombra escura projetada para baixo à direita (sombra).

- **`shadow-xs` (Micro Relevo):**
  - Light: `0px 1px 2px 0px #1018280d`
  - Dark: `0px 1px 2px 0px #0000001a`
- **`shadow-1` (Neumórfico Leve - Cards e Inputs):**
  - Light: `-8px -8px 24px 0px #ffffff80, 8px 8px 24px 0px #1d293926`
  - Dark: `-8px -8px 24px 0px #eaecf00d, 8px 8px 24px 0px #0006`
- **`shadow-2` (Neumórfico Destacado - Dropdowns e Modais):**
  - Light: `-8px -8px 24px 0px #ffffff80, 8px 8px 32px 0px #1d29393d`
  - Dark: `-8px -8px 24px 0px #eaecf00d, 8px 8px 40px 0px #0006`
- **`shadow-featured-icon-light` (Para Ícones Circulares):**
  - Light: `-2.56px -2.56px 7.68px 0px #ffffff80, 2.56px 2.56px 7.68px 0px #23232317`

### Radii (Bordas Arredondadas):
- `--radius-xs`: `0.125rem`
- `--radius-sm`: `0.25rem`
- `--radius-md`: `0.375rem` (Padrão para botões menores)
- `--radius-lg`: `0.5rem` (Padrão para botões de login, inputs)
- `--radius-xl`: `0.75rem`
- `--radius-2xl`: `1.00rem` (Padrão para cards e caixas de informação)
- `--radius-4xl`: `2.00rem` (Padrão para badges e pílulas de status)

---

## 5. Transições e Efeitos de Hover

A Salvy adota transições consistentes com uma aceleração elegante.

- **Duração Padrão:** `0.15s` (`duration-150`)
- **Easing Padrão (ease-in-out):** `cubic-bezier(0.4, 0, 0.2, 1)`
- **Efeito Hover para Links/Ações Principais:**
  - `hover:scale-105`: Aumenta sutilmente em hover (`scale: 1.05`)
  - Transição de cores: `transition-colors duration-200 ease-out`
  - Estados do Botão Principal:
    - Light Mode: Fundo `--color-brand-800` (`#372d23`), Hover muda para `--color-brand-900` (`#181410`) ou `--color-brand-300` com hover scale.

### Gradientes:
- **`purple-dark-gradient`:** `linear-gradient(239.12deg, #1d2939 8.64%, #5d5fef 84.57%)`
- **`purple-pink-gradient`:** `linear-gradient(215deg, #e99be8 -33.81%, #a891f8 40.74%, #3336eb 118.46%)`

---

## 6. Logo Oficial (SVG)

Abaixo está o SVG oficial da Salvy em sua proporção de visualização padrão (`100x100` com classe `size-14 text-gray-900`):

```xml
<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <title>Logo Salvy</title>
  <path d="M72.0506 47.2515C71.2973 43.9064 67.8942 41.8806 64.5892 42.7965C63.8092 43.0127 63.0403 43.2356 62.2826 43.4629C62.0998 42.4734 61.8993 41.4705 61.6831 40.4543C58.6945 26.4051 53.0494 13.0401 51.6187 9.76851C51.4159 9.30274 50.959 9.0041 50.4509 9.00187C47.859 8.99519 40.0901 9.00856 40.0901 9.00856C39.6577 9.00856 39.3078 9.36068 39.3056 9.79303C39.1964 31.8451 34.494 41.7758 31.1444 41.7758C28.9292 41.7758 25.7824 36.63 24.1042 25.3309C23.2351 19.4875 23.01 13.7756 22.9855 9.78412C22.9832 9.35176 22.6311 9.00856 22.201 9.00856H11C11 13.419 11.2162 20.136 12.2502 27.0937C13.2955 34.1295 14.9536 39.8347 17.1799 44.0557C21.4121 52.0765 27.1084 53.7613 31.1444 53.7613C36.7917 53.7613 44.3244 50.6925 48.3181 36.1998C48.9131 38.3817 49.4725 40.6437 49.9606 42.9459C50.2882 44.4858 50.5935 46.0815 50.8587 47.7062C45.8577 49.9949 41.6144 52.6225 38.1645 55.5776C31.9578 60.8906 28.2673 67.1887 27.1909 74.2957C26.2994 80.1904 28.8489 85.8622 33.8499 89.0982C36.3705 90.7295 39.1986 91.543 42.0289 91.543C44.8593 91.543 47.6919 90.7273 50.2191 89.0982C57.4799 84.4203 61.8903 76.8921 63.33 66.7274C63.8136 63.302 63.9563 59.5646 63.7557 55.5397C65.046 55.123 66.3854 54.7241 67.7716 54.3407C70.865 53.4872 72.757 50.376 72.0528 47.2448L72.0506 47.2515ZM43.7271 79.0293C42.1961 80.0166 40.8612 79.3658 40.3597 79.0404C39.758 78.6527 38.7886 77.7523 39.0404 76.092C39.9541 70.0547 44.3044 64.833 51.8393 60.5964C51.5919 68.3164 49.4814 75.3209 43.7294 79.0293H43.7271Z" fill="currentColor"></path>
  <path d="M82.135 50.2758C85.3992 50.2758 88.0453 47.6296 88.0453 44.3655C88.0453 41.1013 85.3992 38.4552 82.135 38.4552C78.8709 38.4552 76.2247 41.1013 76.2247 44.3655C76.2247 47.6296 78.8709 50.2758 82.135 50.2758Z" fill="currentColor"></path>
</svg>
```

---

## 7. Como Utilizar esta Skill Local

Ao criar novos componentes no projeto:
1. **Sempre use as variáveis nativas de cor e fonte** definidas neste arquivo.
2. Não use placeholders ou cores genéricas da paleta básica (evite plain red, blue, green). Utilize as cores mapeadas especificamente para a Salvy (como a marca `brand` e `blue` semânticas).
3. **Mantenha suporte a Dark Mode** estruturando seu CSS ou suas Tailwind classes para respeitar a inversão de classes `.dark`.
