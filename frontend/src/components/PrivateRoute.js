function PrivateRoute({ children }) {
  // 🚀 Ahora siempre permite el acceso sin verificar login
  return children;
}

export default PrivateRoute;
