import api from './axios'

export const generateProjectQuotation = (projectId, payload) =>
  api.post(`/projects/${projectId}/quotations/generate`, payload)

export const updateQuotationStatus = (quotationId, payload) =>
  api.patch(`/quotations/${quotationId}/status`, payload)
