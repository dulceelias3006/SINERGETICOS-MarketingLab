// ============================
// DATOS INICIALES DE LA APP
// ============================

export const initialEnlaces = [
  { id: 1, nombre: "Notion Workspace", url: "https://notion.so", categoria: "Gestión", descripcion: "Espacio de trabajo principal", favorito: true },
  { id: 2, nombre: "Figma Diseño", url: "https://figma.com", categoria: "Diseño", descripcion: "Proyectos de diseño", favorito: true },
  { id: 3, nombre: "Google Analytics", url: "https://analytics.google.com", categoria: "Analíticas", descripcion: "Métricas de tráfico web", favorito: false },
  { id: 4, nombre: "Hootsuite", url: "https://hootsuite.com", categoria: "Redes Sociales", descripcion: "Gestión de redes sociales", favorito: false },
  { id: 5, nombre: "Mailchimp", url: "https://mailchimp.com", categoria: "Email", descripcion: "Campañas de email marketing", favorito: true },
  { id: 6, nombre: "Canva Pro", url: "https://canva.com", categoria: "Diseño", descripcion: "Creación de contenido visual", favorito: false },
  { id: 7, nombre: "HubSpot CRM", url: "https://hubspot.com", categoria: "CRM", descripcion: "Gestión de clientes y leads", favorito: true },
  { id: 8, nombre: "SEMrush", url: "https://semrush.com", categoria: "SEO", descripcion: "Análisis SEO y competencia", favorito: false },
  { id: 9, nombre: "Trello Board", url: "https://trello.com", categoria: "Gestión", descripcion: "Tablero de tareas del equipo", favorito: false },
  { id: 10, nombre: "Slack Marketing", url: "https://slack.com", categoria: "Comunicación", descripcion: "Canal de comunicación interna", favorito: true },
  { id: 11, nombre: "YouTube Studio", url: "https://studio.youtube.com", categoria: "Video", descripcion: "Gestión de canal de YouTube", favorito: false },
  { id: 12, nombre: "Meta Ads Manager", url: "https://business.facebook.com", categoria: "Publicidad", descripcion: "Gestión de anuncios de Meta", favorito: true },
  { id: 13, nombre: "Google Ads", url: "https://ads.google.com", categoria: "Publicidad", descripcion: "Campañas de Google Ads", favorito: false },
  { id: 14, nombre: "Ahrefs", url: "https://ahrefs.com", categoria: "SEO", descripcion: "Backlinks y análisis de SEO", favorito: false },
  { id: 15, nombre: "Spotify for Podcasters", url: "https://podcasters.spotify.com", categoria: "Audio", descripcion: "Gestión de podcast", favorito: false },
  { id: 16, nombre: "LinkedIn Ads", url: "https://business.linkedin.com", categoria: "Publicidad", descripcion: "Publicidad en LinkedIn", favorito: false },
];

export const initialAccesos = [
  { id: 1, servicio: "Google Workspace", usuario: "marketing@sinergeticos.com", contrasena: "••••••••••", notas: "Admin principal", color: "#4a9eff" },
  { id: 2, servicio: "Meta Business Suite", usuario: "ads@sinergeticos.com", contrasena: "••••••••••", notas: "Cuenta de anuncios", color: "#e879a0" },
  { id: 3, servicio: "Servidor FTP", usuario: "ftp_mkt", contrasena: "••••••••••", notas: "IP: 192.168.1.100", color: "#fb923c" },
  { id: 4, servicio: "WordPress Admin", usuario: "admin_mkt", contrasena: "••••••••••", notas: "Blog corporativo", color: "#4ade80" },
  { id: 5, servicio: "AWS S3", usuario: "mkt-team@sinergeticos.com", contrasena: "••••••••••", notas: "Almacenamiento assets", color: "#facc15" },
  { id: 6, servicio: "Cloudflare", usuario: "devops@sinergeticos.com", contrasena: "••••••••••", notas: "DNS y CDN", color: "#22d3ee" },
  { id: 7, servicio: "Hotjar", usuario: "analytics@sinergeticos.com", contrasena: "••••••••••", notas: "Heatmaps y sesiones", color: "#9b59b6" },
];

export const initialEventos = [
  {
    id: 1,
    titulo: "Lanzamiento Campaña Q2",
    fecha: "2026-04-20",
    hora: "10:00",
    tipo: "Campaña",
    prioridad: "Alta",
    descripcion: "Lanzamiento oficial de la campaña de publicidad del segundo trimestre",
    responsable: "Dulce",
    estado: "Pendiente",
    color: "#e879a0"
  },
  {
    id: 2,
    titulo: "Reunión con Agencia Creativa",
    fecha: "2026-04-22",
    hora: "14:00",
    tipo: "Reunión",
    prioridad: "Media",
    descripcion: "Revisión de piezas gráficas para redes sociales",
    responsable: "Carlos",
    estado: "Confirmado",
    color: "#4a9eff"
  },
  {
    id: 3,
    titulo: "Entrega Informe Mensual",
    fecha: "2026-04-30",
    hora: "09:00",
    tipo: "Entrega",
    prioridad: "Alta",
    descripcion: "Reporte de métricas y KPIs de abril",
    responsable: "Ana",
    estado: "Pendiente",
    color: "#fb923c"
  },
  {
    id: 4,
    titulo: "Workshop SEO Interno",
    fecha: "2026-05-05",
    hora: "11:00",
    tipo: "Capacitación",
    prioridad: "Media",
    descripcion: "Taller de actualización en estrategias SEO 2026",
    responsable: "Miguel",
    estado: "Pendiente",
    color: "#4ade80"
  },
  {
    id: 5,
    titulo: "Publicación Blog Corporativo",
    fecha: "2026-05-08",
    hora: "08:00",
    tipo: "Publicación",
    prioridad: "Baja",
    descripcion: "Artículo sobre tendencias de marketing digital",
    responsable: "Lucía",
    estado: "En proceso",
    color: "#9b59b6"
  },
  {
    id: 6,
    titulo: "Revisión Presupuesto Q3",
    fecha: "2026-05-15",
    hora: "16:00",
    tipo: "Reunión",
    prioridad: "Alta",
    descripcion: "Revisión y aprobación del presupuesto del tercer trimestre",
    responsable: "Dulce",
    estado: "Pendiente",
    color: "#facc15"
  },
  {
    id: 7,
    titulo: "Campaña Email Marketing",
    fecha: "2026-05-18",
    hora: "07:00",
    tipo: "Campaña",
    prioridad: "Alta",
    descripcion: "Envío de newsletter mensual a base de datos",
    responsable: "Ana",
    estado: "Pendiente",
    color: "#e879a0"
  },
  {
    id: 8,
    titulo: "Foto Productos Nuevos",
    fecha: "2026-05-20",
    hora: "10:00",
    tipo: "Producción",
    prioridad: "Media",
    descripcion: "Sesión fotográfica de la nueva línea de productos",
    responsable: "Carlos",
    estado: "Confirmado",
    color: "#22d3ee"
  },
  {
    id: 9,
    titulo: "Análisis Competencia",
    fecha: "2026-05-25",
    hora: "14:00",
    tipo: "Análisis",
    prioridad: "Media",
    descripcion: "Benchmark de competidores en redes sociales",
    responsable: "Miguel",
    estado: "Pendiente",
    color: "#fb923c"
  },
  {
    id: 10,
    titulo: "Presentación Dirección",
    fecha: "2026-05-28",
    hora: "09:00",
    tipo: "Presentación",
    prioridad: "Alta",
    descripcion: "Presentación de resultados semestrales a dirección general",
    responsable: "Dulce",
    estado: "Pendiente",
    color: "#f87171"
  },
  {
    id: 11,
    titulo: "Rediseño Landing Page",
    fecha: "2026-06-01",
    hora: "09:00",
    tipo: "Diseño",
    prioridad: "Alta",
    descripcion: "Lanzamiento del rediseño de la página principal",
    responsable: "Lucía",
    estado: "En proceso",
    color: "#4a9eff"
  },
  {
    id: 12,
    titulo: "Podcast Episodio 12",
    fecha: "2026-06-05",
    hora: "15:00",
    tipo: "Producción",
    prioridad: "Baja",
    descripcion: "Grabación del episodio 12 del podcast corporativo",
    responsable: "Carlos",
    estado: "Pendiente",
    color: "#9b59b6"
  },
  {
    id: 13,
    titulo: "Auditoría Redes Sociales",
    fecha: "2026-06-10",
    hora: "10:00",
    tipo: "Análisis",
    prioridad: "Media",
    descripcion: "Revisión completa del performance en redes",
    responsable: "Ana",
    estado: "Pendiente",
    color: "#4ade80"
  },
  {
    id: 14,
    titulo: "Cierre Semestre",
    fecha: "2026-06-30",
    hora: "17:00",
    tipo: "Reunión",
    prioridad: "Alta",
    descripcion: "Cierre del primer semestre y planificación del segundo",
    responsable: "Dulce",
    estado: "Pendiente",
    color: "#facc15"
  },
];

export const initialEquipo = [
  { id: 1, nombre: "Dulce Lucero", rol: "Directora de Marketing", email: "dulce@sinergeticos.com", departamento: "Dirección", estado: "Activo", color: "#e879a0", iniciales: "DL" },
  { id: 2, nombre: "Carlos Mendoza", rol: "Diseñador Gráfico Sr.", email: "carlos@sinergeticos.com", departamento: "Diseño", estado: "Activo", color: "#4a9eff", iniciales: "CM" },
  { id: 3, nombre: "Ana Torres", rol: "Social Media Manager", email: "ana@sinergeticos.com", departamento: "Redes Sociales", estado: "Activo", color: "#4ade80", iniciales: "AT" },
  { id: 4, nombre: "Miguel Ángel Ruiz", rol: "SEO Specialist", email: "miguel@sinergeticos.com", departamento: "SEO/SEM", estado: "Activo", color: "#fb923c", iniciales: "MR" },
  { id: 5, nombre: "Lucía Vega", rol: "Copywriter", email: "lucia@sinergeticos.com", departamento: "Contenido", estado: "Activo", color: "#9b59b6", iniciales: "LV" },
  { id: 6, nombre: "Roberto Sánchez", rol: "Paid Media Manager", email: "roberto@sinergeticos.com", departamento: "Publicidad", estado: "Activo", color: "#facc15", iniciales: "RS" },
  { id: 7, nombre: "Gabriela Flores", rol: "Community Manager", email: "gabi@sinergeticos.com", departamento: "Redes Sociales", estado: "Activo", color: "#22d3ee", iniciales: "GF" },
  { id: 8, nombre: "Andrés Morales", rol: "Analista de Datos", email: "andres@sinergeticos.com", departamento: "Analíticas", estado: "Activo", color: "#f87171", iniciales: "AM" },
  { id: 9, nombre: "Sofía Herrera", rol: "Diseñadora UX/UI", email: "sofia@sinergeticos.com", departamento: "Diseño", estado: "Activo", color: "#e879a0", iniciales: "SH" },
  { id: 10, nombre: "Diego Ramírez", rol: "Video Producer", email: "diego@sinergeticos.com", departamento: "Contenido", estado: "Activo", color: "#4a9eff", iniciales: "DR" },
  { id: 11, nombre: "Valentina Cruz", rol: "PR & Comunicación", email: "valentina@sinergeticos.com", departamento: "Comunicación", estado: "Activo", color: "#4ade80", iniciales: "VC" },
  { id: 12, nombre: "Héctor Lima", rol: "Desarrollador Web", email: "hector@sinergeticos.com", departamento: "Tecnología", estado: "Vacaciones", color: "#fb923c", iniciales: "HL" },
  { id: 13, nombre: "Patricia Núñez", rol: "Email Marketing", email: "patricia@sinergeticos.com", departamento: "Email", estado: "Activo", color: "#9b59b6", iniciales: "PN" },
  { id: 14, nombre: "Fernando Jiménez", rol: "Brand Manager", email: "fernando@sinergeticos.com", departamento: "Marca", estado: "Activo", color: "#facc15", iniciales: "FJ" },
];

export const initialTickets = [
  { id: 1, titulo: "Actualizar paleta de colores en web", descripcion: "Aplicar la nueva identidad visual en todos los elementos del sitio", prioridad: "Alta", tipo: "Diseño", asignado: "Sofia", columna: "backlog", color: "#4a9eff" },
  { id: 2, titulo: "Optimizar velocidad de carga", descripcion: "Mejorar el Core Web Vitals score a más de 90", prioridad: "Alta", tipo: "Técnico", asignado: "Hector", columna: "en-progreso", color: "#fb923c" },
  { id: 3, titulo: "Crear guía de estilo de contenido", descripcion: "Documentar el tono de voz y estilo editorial de la marca", prioridad: "Media", tipo: "Contenido", asignado: "Lucia", columna: "en-revision", color: "#9b59b6" },
  { id: 4, titulo: "Integrar pixel de Meta Ads", descripcion: "Configurar el pixel de seguimiento de conversiones en el sitio", prioridad: "Alta", tipo: "Técnico", asignado: "Hector", columna: "backlog", color: "#e879a0" },
  { id: 5, titulo: "Diseñar infografía Q1 2026", descripcion: "Visualización de resultados del primer trimestre para presentación", prioridad: "Media", tipo: "Diseño", asignado: "Carlos", columna: "completado", color: "#4ade80" },
  { id: 6, titulo: "Auditoría de keywords", descripcion: "Revisar y actualizar la estrategia de palabras clave para SEO", prioridad: "Media", tipo: "SEO", asignado: "Miguel", columna: "en-progreso", color: "#facc15" },
  { id: 7, titulo: "Newsletter template rediseño", descripcion: "Actualizar la plantilla de email para alinear con nueva identidad", prioridad: "Baja", tipo: "Diseño", asignado: "Patricia", columna: "backlog", color: "#22d3ee" },
  { id: 8, titulo: "Configurar Google Tag Manager", descripcion: "Implementar GTM para gestión centralizada de etiquetas", prioridad: "Alta", tipo: "Técnico", asignado: "Andres", columna: "en-revision", color: "#f87171" },
  { id: 9, titulo: "Estrategia TikTok Q2", descripcion: "Definir contenidos y calendario para canal de TikTok", prioridad: "Media", tipo: "Estrategia", asignado: "Gabriela", columna: "backlog", color: "#e879a0" },
  { id: 10, titulo: "Video corporativo 2026", descripcion: "Producción del video de presentación anual de la empresa", prioridad: "Alta", tipo: "Video", asignado: "Diego", columna: "en-progreso", color: "#4a9eff" },
  { id: 11, titulo: "Landing page campaña verano", descripcion: "Diseño y desarrollo de landing para campaña de temporada", prioridad: "Alta", tipo: "Diseño", asignado: "Sofia", columna: "backlog", color: "#fb923c" },
  { id: 12, titulo: "Reporte ROI campañas pagadas", descripcion: "Análisis del retorno de inversión de las campañas de paid media", prioridad: "Media", tipo: "Analíticas", asignado: "Roberto", columna: "completado", color: "#4ade80" },
];

export const initialUsuarios = [
  { id: 1, nombre: "Dulce Lucero", email: "dulce@sinergeticos.com", rol: "Admin", estado: "Activo", ultimoAcceso: "Hace 2 min", color: "#e879a0", iniciales: "DL" },
  { id: 2, nombre: "Carlos Mendoza", email: "carlos@sinergeticos.com", rol: "Editor", estado: "Activo", ultimoAcceso: "Hace 1 hora", color: "#4a9eff", iniciales: "CM" },
  { id: 3, nombre: "Ana Torres", email: "ana@sinergeticos.com", rol: "Editor", estado: "Activo", ultimoAcceso: "Hoy 09:30", color: "#4ade80", iniciales: "AT" },
  { id: 4, nombre: "Miguel Ángel Ruiz", email: "miguel@sinergeticos.com", rol: "Viewer", estado: "Activo", ultimoAcceso: "Ayer", color: "#fb923c", iniciales: "MR" },
  { id: 5, nombre: "Lucía Vega", email: "lucia@sinergeticos.com", rol: "Editor", estado: "Inactivo", ultimoAcceso: "Hace 3 días", color: "#9b59b6", iniciales: "LV" },
];
