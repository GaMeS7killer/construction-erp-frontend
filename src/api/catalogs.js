import api from './axios'

export const getMaterials = () => api.get('/materials')
export const getLaborTypes = () => api.get('/labor-types')
export const getEquipment = () => api.get('/equipment')

export const createMaterial = (payload) => api.post('/materials', payload)
export const createLaborType = (payload) => api.post('/labor-types', payload)
export const createEquipment = (payload) => api.post('/equipment', payload)

export const updateMaterial = (id, payload) => api.put(`/materials/${id}`, payload)
export const updateLaborType = (id, payload) => api.put(`/labor-types/${id}`, payload)
export const updateEquipment = (id, payload) => api.put(`/equipment/${id}`, payload)

export const deleteMaterial = (id) => api.delete(`/materials/${id}`)
export const deleteLaborType = (id) => api.delete(`/labor-types/${id}`)
export const deleteEquipment = (id) => api.delete(`/equipment/${id}`)
