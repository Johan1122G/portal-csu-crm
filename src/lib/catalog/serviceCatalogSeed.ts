// Catálogo de servicios/productos de BEXT (portafolio por unidad), transcrito del
// Excel "Catalogo_Servicios_Bext.xlsx". Fuente del seed idempotente. Es lo que
// BEXT OFRECE (para upsell), distinto de ProductService (lo que el cliente tiene).

export type ServiceSeed = {
  unidad: string
  linea?: string
  nombre: string
  nombreCompleto?: string
  categoria?: string
  descripcion?: string
}

export const SERVICE_CATALOG_SEED: ServiceSeed[] = [
  // ── Producto (Soluciones de Software) ──────────────────────────────────────
  { unidad: "Producto", nombre: "BestDoc", nombreCompleto: "BESTDoc", categoria: "Gestión documental", descripcion: "Plataforma de producción, gestión y disponibilidad de documentos digitales (ventanilla única PQRS, gestor documental, flujos y firmas). Disponible en Azure Marketplace." },
  { unidad: "Producto", nombre: "BSP", nombreCompleto: "BEXT Smart Process", categoria: "Automatización de procesos (BPM)", descripcion: "BPMS para automatizar y transformar procesos digitales sin programación (formularios, flujos, permisos, trazabilidad)." },
  { unidad: "Producto", nombre: "BDM", nombreCompleto: "BEXT Directory Manager", categoria: "Gestión de identidades y accesos (suite)", descripcion: "Suite para integración de credenciales y gestión del ciclo de vida de identidades. Componentes: BRM, BSR, BIM." },
  { unidad: "Producto", nombre: "BRM", nombreCompleto: "BEXT Role Manager", categoria: "Componente de la suite BDM", descripcion: "Control centralizado del ciclo de vida de cuentas y privilegios de acceso." },
  { unidad: "Producto", nombre: "BSR", nombreCompleto: "BEXT SelfReset", categoria: "Componente de la suite BDM", descripcion: "Administración y control de acceso basado en roles (RBAC) sobre datos y aplicaciones sensibles." },
  { unidad: "Producto", nombre: "BIM", nombreCompleto: "BEXT Identity Manager", categoria: "Componente de la suite BDM", descripcion: "Autoservicio para que los usuarios restauren y gestionen su contraseña vía web." },

  // ── Aplicaciones (Servicios Profesionales) ─────────────────────────────────
  { unidad: "Aplicaciones", linea: "Experiencias Digitales", nombre: "Portales web e Intranets", descripcion: "Portales e intranets modernos (SharePoint Online, Drupal, WordPress) con UX/UI, integraciones Azure AD/CMS y gobierno." },
  { unidad: "Aplicaciones", linea: "Experiencias Digitales", nombre: "Aplicaciones a la medida", descripcion: "Software personalizado escalable (.NET, Angular, cloud-native, Power Platform low-code) integrado con ERP/CRM/AD/APIs." },
  { unidad: "Aplicaciones", linea: "Experiencias Digitales", nombre: "Chatbots y Agentes de IA", descripcion: "Chatbots y agentes con IA conversacional (Azure AI Foundry, AWS Bedrock, RAG) integrados con web, apps y WhatsApp/Teams." },
  { unidad: "Aplicaciones", linea: "Experiencias Digitales", nombre: "Innovation Lab", descripcion: "Laboratorio para experimentar y adoptar Microsoft 365 Copilot de forma segura, con casos de uso y medición de valor." },
  { unidad: "Aplicaciones", linea: "DevOps, Infraestructura y Nube", nombre: "DevOps & CI/CD", descripcion: "Pipelines CI/CD (Azure DevOps, GitHub) con automatización de pruebas/despliegues, observabilidad y gobernanza." },
  { unidad: "Aplicaciones", linea: "DevOps, Infraestructura y Nube", nombre: "Pruebas de calidad", descripcion: "QA del software con pruebas automatizadas (Azure Test Plans), análisis estático (SonarQube) e integración a CI/CD." },
  { unidad: "Aplicaciones", linea: "DevOps, Infraestructura y Nube", nombre: "Kubernetes / OpenShift", descripcion: "Contenedores empresariales (AKS, ARO), modernización a microservicios, RBAC, autoscaling y observabilidad." },
  { unidad: "Aplicaciones", linea: "DevOps, Infraestructura y Nube", nombre: "Infraestructura como Código", descripcion: "IaC con Terraform en Azure/AWS/híbrido: aprovisionamiento reproducible, módulos gobernados y cumplimiento." },
  { unidad: "Aplicaciones", linea: "Inteligencia de Datos", nombre: "Analítica avanzada con Microsoft Fabric", descripcion: "Analítica unificada (Lakehouses, pipelines, ML, Power BI) con gobierno y seguridad vía Purview." },
  { unidad: "Aplicaciones", linea: "Inteligencia de Datos", nombre: "Analítica avanzada con Azure", descripcion: "Arquitecturas de datos modernas (Synapse, Data Lake, Databricks, Data Factory, Azure ML) con Power BI y Purview." },
  { unidad: "Aplicaciones", linea: "Inteligencia de Datos", nombre: "Analítica avanzada con AWS", descripcion: "Analítica sobre AWS (Redshift, EMR, Glue, Athena, SageMaker, QuickSight) con gobernanza Lake Formation/IAM." },
  { unidad: "Aplicaciones", linea: "Inteligencia de Datos", nombre: "Gobierno de datos", descripcion: "Gobierno centralizado con Azure Purview: catalogación, linaje, clasificación de datos sensibles y cumplimiento." },
  { unidad: "Aplicaciones", linea: "Inteligencia de Datos", nombre: "Modelos de IA", descripcion: "ML/Deep Learning aplicado (clasificación, regresión, NLP, series de tiempo) con MLOps e integración cloud." },
  { unidad: "Aplicaciones", linea: "Inteligencia de Datos", nombre: "Tableros de control", descripcion: "Dashboards ejecutivos en Power BI (DAX, modelado estrella, RLS) conectados a múltiples fuentes." },

  // ── Plataformas (Servicios Profesionales) ──────────────────────────────────
  { unidad: "Plataformas", nombre: "BextVolution", categoria: "Análisis y modernización de Nube", descripcion: "Optimización Well-Architected (WAR/WAF) de cargas en AWS/Azure: costos, seguridad y administración (IaaS/PaaS)." },
  { unidad: "Plataformas", nombre: "BextInnovate", categoria: "Migración y Adopción de Nube", descripcion: "Adopción de nube guiada por CAF: arquitecturas a la medida, migración de apps/BD/WordPress, Lift & Shift, gobernanza." },
  { unidad: "Plataformas", nombre: "BextDR Solutions", categoria: "Recuperación ante Desastres (DR)", descripcion: "DR para continuidad del negocio (AWS Elastic DR, Azure Site Recovery): failover/failback, pruebas e informes." },
  { unidad: "Plataformas", nombre: "BextBackup Solutions", categoria: "Backup en la nube", descripcion: "Backup en nube pública/híbrida (NetApp, Veeam) con buenas prácticas de seguridad y restauración." },
  { unidad: "Plataformas", nombre: "BextCloud Center", categoria: "Contact Center y Bots en la nube", descripcion: "Contact Center multicanal con bots (Amazon Connect, Lex, QnABot) por paquetes de minutos/mensajes/usuarios." },
  { unidad: "Plataformas", nombre: "BextSuite 365", categoria: "Microsoft 365", descripcion: "Migración, configuración, aseguramiento y gestión de M365 (Teams, SharePoint, Exchange, Intune) y optimización de licenciamiento." },
  { unidad: "Plataformas", nombre: "BextIdentity Solutions", categoria: "Gestión de identidades", descripcion: "Automatización y seguridad de autenticación con administración de Active Directory; informes y soporte." },
  { unidad: "Plataformas", nombre: "BextCare", categoria: "Servicios administrados", descripcion: "Servicios administrados (nube pública y M365) con gestión proactiva, optimización de costos y soporte reactivo (BextRescue)." },

  // ── CSU - Offering ──────────────────────────────────────────────────────────
  { unidad: "CSU", nombre: "BextSight", categoria: "Monitoreo gestionado / Observabilidad (MaaS)", descripcion: "Monitoreo gestionado con visión de negocio; lleva al cliente de reactivo a proactivo en 30 días. Modalidades 5x8 / 7x8 / 7x24." },
  { unidad: "CSU", nombre: "BextReady Copilot", categoria: "Habilitación y adopción de IA (Copilot)", descripcion: "Habilitación rápida (4 semanas) de Copilot Dashboard y Agent 365 en modo Frontier, con gobierno, Champions y roadmap." },
  { unidad: "CSU", nombre: "Innovation Lab (Copilot)", categoria: "Innovación y adopción de IA", descripcion: "Laboratorio de IA responsable alrededor de Copilot: casos de uso de alto impacto, gamificación y certificación de Champions." },

  // ── Managed Services (BextCare) ─────────────────────────────────────────────
  { unidad: "Managed Services", nombre: "Servicios Administrados y gestionados (Cloud/M365)", categoria: "Gestión proactiva", descripcion: "Administración integral de infraestructura Cloud, seguridad e identidades + Suite M365, con foco en monitoreo y optimización de costos. FEE mensual/anual." },
  { unidad: "Managed Services", nombre: "Servicios Administrados sobre Nube Pública", categoria: "Gestión proactiva (Cloud)", descripcion: "Servicios administrados de infraestructura en nube pública (Azure/AWS) con fase de transición, gestión de fallas N1, automatización y optimización de costos." },
  { unidad: "Managed Services", nombre: "Servicios Administrados M365", categoria: "Gestión proactiva (M365)", descripcion: "Servicios administrados de Microsoft 365 (Entra ID) con fase de transición, gestión de usuarios/aplicaciones, monitoreo y automatización." },
  { unidad: "Managed Services", nombre: "Optimización de costos", categoria: "Optimización", descripcion: "Optimización de costos de nube incluida en los servicios administrados: alertas de consumo, rightsizing, reservas, eliminación de recursos sin uso." },
  { unidad: "Managed Services", nombre: "Soporte Reactivo (BextRescue)", categoria: "Soporte reactivo / especializado", descripcion: "Soporte especializado en Cloud, seguridad y plataformas (Azure, AWS, MIM, AD, M365, Entra ID, Windows Server, networking). 5x8 / 7x24, FEE o bolsa de horas." },
]
