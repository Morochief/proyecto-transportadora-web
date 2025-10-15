# 🎨 Guía de Personalización - Módulo de Usuarios

Esta guía te ayudará a personalizar fácilmente el módulo de usuarios según tus preferencias de diseño.

---

## 🎯 Tabla de Contenidos
1. [Cambiar Colores del Header](#cambiar-colores-del-header)
2. [Modificar Gradientes de Badges](#modificar-gradientes-de-badges)
3. [Personalizar Avatares](#personalizar-avatares)
4. [Ajustar Espaciado y Tamaños](#ajustar-espaciado-y-tamaños)
5. [Cambiar Animaciones](#cambiar-animaciones)
6. [Modificar Responsive Breakpoints](#modificar-responsive-breakpoints)
7. [Personalizar el Modal](#personalizar-el-modal)

---

## 🎨 1. Cambiar Colores del Header

### Ubicación
`frontend/src/pages/Usuarios.css` - Línea ~12

### Código Original
```css
.usuarios-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* ... */
}
```

### Ejemplos de Personalización

#### Gradiente Azul-Verde
```css
.usuarios-header {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
```

#### Gradiente Naranja-Rosa
```css
.usuarios-header {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}
```

#### Gradiente Verde
```css
.usuarios-header {
  background: linear-gradient(135deg, #38ef7d 0%, #11998e 100%);
}
```

#### Color Sólido (Sin Gradiente)
```css
.usuarios-header {
  background: #2c3e50;
}
```

---

## 🏷️ 2. Modificar Gradientes de Badges

### Badges de Estado

#### Badge Activo
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~228

```css
/* Verde brillante (original) */
.badge-activo {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

/* Alternativa: Verde azulado */
.badge-activo {
  background: linear-gradient(135deg, #00b09b 0%, #96c93d 100%);
}
```

#### Badge Inactivo
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~234

```css
/* Rojo (original) */
.badge-inactivo {
  background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
}

/* Alternativa: Gris */
.badge-inactivo {
  background: linear-gradient(135deg, #bdc3c7 0%, #95a5a6 100%);
}
```

#### Badge Suspendido
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~240

```css
/* Naranja (original) */
.badge-suspendido {
  background: linear-gradient(135deg, #fbb034 0%, #f59e0b 100%);
}

/* Alternativa: Amarillo */
.badge-suspendido {
  background: linear-gradient(135deg, #f7b733 0%, #fc4a1a 100%);
}
```

### Badges de Rol

#### Rol Admin
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~262

```css
/* Rojo-Rosa (original) */
.role-admin {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
}

/* Alternativa: Púrpura oscuro */
.role-admin {
  background: linear-gradient(135deg, #654ea3 0%, #eaafc8 100%);
}
```

#### Rol Operador
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~267

```css
/* Azul claro (original) */
.role-operador {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

/* Alternativa: Azul oscuro */
.role-operador {
  background: linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%);
}
```

---

## 👤 3. Personalizar Avatares

### Tamaño del Avatar
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~189

```css
/* Original (44px) */
.user-avatar {
  width: 44px;
  height: 44px;
  /* ... */
}

/* Avatar más grande */
.user-avatar {
  width: 56px;
  height: 56px;
  font-size: 1.3rem; /* Aumenta también el tamaño de las iniciales */
}

/* Avatar más pequeño */
.user-avatar {
  width: 36px;
  height: 36px;
  font-size: 0.9rem;
}
```

### Color del Avatar
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~192

```css
/* Gradiente púrpura (original) */
.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Alternativa: Gradiente azul */
.user-avatar {
  background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
}

/* Alternativa: Color sólido */
.user-avatar {
  background: #3498db;
}

/* Alternativa: Colores aleatorios por usuario */
/* (Requiere JavaScript - ver sección avanzada) */
```

### Forma del Avatar
```css
/* Circular (original) */
.user-avatar {
  border-radius: 50%;
}

/* Cuadrado redondeado */
.user-avatar {
  border-radius: 12px;
}

/* Cuadrado */
.user-avatar {
  border-radius: 0;
}
```

---

## 📏 4. Ajustar Espaciado y Tamaños

### Padding del Container
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~5

```css
/* Original */
.usuarios-container {
  padding: 24px;
}

/* Más espacioso */
.usuarios-container {
  padding: 40px;
}

/* Más compacto */
.usuarios-container {
  padding: 16px;
}
```

### Tamaño de Fuente del Header
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~23

```css
/* Original */
.usuarios-header-content h2 {
  font-size: 2rem;
}

/* Más grande */
.usuarios-header-content h2 {
  font-size: 2.5rem;
}

/* Más pequeño */
.usuarios-header-content h2 {
  font-size: 1.75rem;
}
```

### Espaciado de la Tabla
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~155

```css
/* Original */
.usuarios-table tbody td {
  padding: 20px;
}

/* Más espacioso */
.usuarios-table tbody td {
  padding: 28px 24px;
}

/* Más compacto */
.usuarios-table tbody td {
  padding: 12px 16px;
}
```

### Ancho Máximo del Container
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~4

```css
/* Original (1400px) */
.usuarios-container {
  max-width: 1400px;
}

/* Más ancho */
.usuarios-container {
  max-width: 1600px;
}

/* Más estrecho */
.usuarios-container {
  max-width: 1200px;
}

/* Sin límite */
.usuarios-container {
  max-width: 100%;
}
```

---

## ⚡ 5. Cambiar Animaciones

### Velocidad de Transiciones
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~162

```css
/* Original (0.2s) */
.usuarios-table tbody tr {
  transition: all 0.2s;
}

/* Más rápido */
.usuarios-table tbody tr {
  transition: all 0.1s;
}

/* Más lento */
.usuarios-table tbody tr {
  transition: all 0.4s;
}
```

### Efecto Hover en la Tabla
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~166

```css
/* Original (con escala) */
.usuarios-table tbody tr:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f7ff 100%);
  transform: scale(1.01);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
}

/* Sin escala, solo color */
.usuarios-table tbody tr:hover {
  background: linear-gradient(135deg, #f8f9ff 0%, #f5f7ff 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.08);
}

/* Efecto más pronunciado */
.usuarios-table tbody tr:hover {
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
}
```

### Animación del Spinner
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~485

```css
/* Original (1s) */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Más rápido */
.spinner {
  animation: spin 0.6s linear infinite;
}

/* Más lento */
.spinner {
  animation: spin 1.5s linear infinite;
}
```

---

## 📱 6. Modificar Responsive Breakpoints

### Cambiar Punto de Quiebre Mobile
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~422

```css
/* Original (768px) */
@media (max-width: 768px) {
  /* Estilos móvil */
}

/* Móvil más grande (hasta 900px) */
@media (max-width: 900px) {
  /* Estilos móvil */
}

/* Móvil más pequeño (hasta 640px) */
@media (max-width: 640px) {
  /* Estilos móvil */
}
```

### Cambiar Punto de Quiebre Tablet
**Ubicación:** `frontend/src/pages/Usuarios.css` - Línea ~395

```css
/* Original (1024px) */
@media (max-width: 1024px) {
  /* Estilos tablet */
}

/* Tablet más grande */
@media (max-width: 1200px) {
  /* Estilos tablet */
}
```

---

## 🎭 7. Personalizar el Modal

### Tamaño del Modal
**Ubicación:** `frontend/src/components/FormModal.js` - Línea ~37

```jsx
/* Original */
<div className="bg-white rounded-2xl p-8 min-w-[400px] max-w-[600px]">

/* Más grande */
<div className="bg-white rounded-2xl p-8 min-w-[500px] max-w-[800px]">

/* Más pequeño */
<div className="bg-white rounded-2xl p-8 min-w-[350px] max-w-[500px]">
```

### Opacidad del Backdrop
**Ubicación:** `frontend/src/components/FormModal.js` - Línea ~32

```jsx
/* Original (40%) */
<div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm">

/* Más oscuro */
<div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm">

/* Más claro */
<div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm">

/* Sin blur */
<div className="fixed inset-0 bg-black bg-opacity-40">
```

### Border Radius del Modal
**Ubicación:** `frontend/src/components/FormModal.js` - Línea ~37

```jsx
/* Original (rounded-2xl = 1rem) */
<div className="bg-white rounded-2xl">

/* Más redondeado */
<div className="bg-white rounded-3xl">

/* Menos redondeado */
<div className="bg-white rounded-xl">

/* Sin redondeo */
<div className="bg-white rounded-none">
```

---

## 🚀 Personalizaciones Avanzadas

### 1. Avatares con Colores Diferentes por Usuario

Edita `frontend/src/pages/Usuarios.js`:

```javascript
// Agregar función para generar color basado en nombre
const getAvatarColor = (name) => {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  ];
  
  // Generar índice basado en el nombre
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

// Usar en el render del avatar
<div 
  className="user-avatar" 
  style={{ background: getAvatarColor(user.display_name || user.usuario) }}
>
  {getInitials(user.display_name || user.usuario)}
</div>
```

### 2. Tema Oscuro

Crear variables CSS para tema oscuro:

```css
/* Agregar al inicio de Usuarios.css */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9ff;
  --text-primary: #2d3748;
  --text-secondary: #718096;
  --border-color: #e2e8f0;
}

[data-theme="dark"] {
  --bg-primary: #1a202c;
  --bg-secondary: #2d3748;
  --text-primary: #f7fafc;
  --text-secondary: #cbd5e0;
  --border-color: #4a5568;
}

/* Usar las variables */
.usuarios-table-container {
  background: var(--bg-primary);
}
```

### 3. Iconos SVG en lugar de Emoji

Reemplazar iconos emoji por iconos SVG de librerías como React Icons:

```bash
npm install react-icons
```

```javascript
import { FiEdit2, FiTrash2, FiSearch, FiLock } from 'react-icons/fi';

// Usar en botones
<button className="btn-action btn-edit">
  <FiEdit2 size={16} />
  Editar
</button>
```

---

## 📚 Recursos Adicionales

### Generadores de Gradientes
- [uiGradients](https://uigradients.com/)
- [CSS Gradient](https://cssgradient.io/)
- [Gradient Hunt](https://gradienthunt.com/)

### Paletas de Colores
- [Coolors](https://coolors.co/)
- [Adobe Color](https://color.adobe.com/)
- [Color Hunt](https://colorhunt.co/)

### Fuentes
- [Google Fonts](https://fonts.google.com/)
- [Font Awesome](https://fontawesome.com/) (iconos)
- [React Icons](https://react-icons.github.io/react-icons/)

---

## 💡 Consejos Finales

1. **Consistencia**: Mantén los mismos colores en toda la aplicación
2. **Contraste**: Asegura buen contraste para accesibilidad (WCAG AA)
3. **Performance**: No abuses de las sombras y gradientes
4. **Testing**: Prueba en diferentes navegadores y dispositivos
5. **Backup**: Guarda copia del CSS original antes de modificar

---

¿Necesitas ayuda con alguna personalización específica? ¡No dudes en preguntar! 🚀
