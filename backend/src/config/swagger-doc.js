export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Laboratorios Sophia - API Predictiva Sophia XAI (Machine Learning)",
    version: "1.0.0",
    description: "API B2B para proyecciones comerciales, reglas de asociación Apriori, segmentación K-Means RFM, regresión polinomial y administración de representantes.",
    contact: {
      name: "Soporte TI Laboratorios Sophia",
      email: "soporte@sophialab.com"
    }
  },
  servers: [
    {
      url: "http://localhost:5005",
      description: "Servidor Local Hono"
    },
    {
      url: "/api",
      description: "Servidor Relativo"
    }
  ],
  paths: {
    "/": {
      get: {
        summary: "Estado de la API Hono",
        description: "Retorna confirmación de estado del servidor.",
        responses: {
          "200": {
            description: "API activa",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Hono.js API Sophia XAI Machine Learning activa"
                }
              }
            }
          }
        }
      }
    },
    "/api/recomendaciones": {
      get: {
        summary: "Historial completo de ventas precargadas",
        description: "Retorna las transacciones históricas registradas de Supabase precargadas en la RAM.",
        security: [{ SupabaseJWT: [] }],
        responses: {
          "200": {
            description: "Listado exitoso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          cliente_id: { type: "integer", example: 23 },
                          cliente: { type: "string", example: "CLINICA OFTALMOLOGICA" },
                          zona_comercial: { type: "string", example: "PHARMA - Z1" },
                          producto: { type: "string", example: "LAGRICEL" },
                          mes_num: { type: "integer", example: 6 },
                          mes_nombre: { type: "string", example: "JUNIO" },
                          cantidad: { type: "integer", example: 15 }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "No autorizado." }
        }
      }
    },
    "/api/zonas": {
      get: {
        summary: "Zonas comerciales únicas",
        description: "Lista de zonas comerciales registradas.",
        security: [{ SupabaseJWT: [] }],
        responses: {
          "200": {
            description: "Zonas encontradas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    zonas: { type: "array", items: { type: "string" }, example: ["PHARMA - Z1", "PHARMA - Z2"] }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/dashboard": {
      get: {
        summary: "Métricas agregadas del Dashboard Comercial",
        description: "Ingresos totales, clientes activos, productos vendidos y Top productos.",
        security: [{ SupabaseJWT: [] }],
        parameters: [
          { name: "zona", in: "query", required: false, schema: { type: "string", default: "Todas" } }
        ],
        responses: {
          "200": {
            description: "Estadísticas obtenidas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ingresos_totales: { type: "number", example: 1582450.5 },
                    clientes_activos: { type: "integer", example: 45 },
                    productos_vendidos: { type: "integer", example: 16 },
                    top_productos: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          producto: { type: "string", example: "LAGRICEL" },
                          ventas: { type: "integer", example: 840 }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/statistics": {
      get: {
        summary: "Telemetría de MLOps y métricas Machine Learning",
        description: "Métricas de Hit Rate, NDCG, Lift y rendimiento del motor Apriori y K-Means.",
        security: [{ SupabaseJWT: [] }],
        parameters: [
          { name: "zona", in: "query", required: false, schema: { type: "string", default: "Todas" } }
        ],
        responses: {
          "200": {
            description: "Telemetría ML obtenida",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    hitRate: { type: "string", example: "0.842" },
                    precision: { type: "string", example: "0.682" },
                    modelSummary: {
                      type: "object",
                      properties: {
                        aprioriConfidence: { type: "string", example: "68.2" },
                        kmeansAccuracy: { type: "string", example: "84.2" },
                        dataQuality: { type: "string", example: "91.2" },
                        status: { type: "string", example: "Healthy (Machine Learning)" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/proyeccion/{cliente_id}": {
      get: {
        summary: "Generar recomendaciones ML y XAI por cliente",
        description: "Ejecuta inferencia de Apriori, K-Means y Regresión Polinomial para proyectar compras a 3 meses.",
        security: [{ SupabaseJWT: [] }],
        parameters: [
          { name: "cliente_id", in: "path", required: true, schema: { type: "integer" } }
        ],
        responses: {
          "200": {
            description: "Proyección generada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    clienteId: { type: "integer", example: 54 },
                    zona: { type: "string", example: "PHARMA - N2" },
                    historial: { type: "array", items: { type: "string" } },
                    proyecciones: { type: "object" },
                    xai_detalles: { type: "object" }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      SupabaseJWT: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT generado por Supabase Authentication."
      }
    }
  }
};
