import { BaseEntityManagement, type BaseEntity } from './BaseEntityManagement';
import { categoriesAPI } from '../../lib/api';

// Real API functions for categories
const realCategoriesAPI = {
  async loadCategories(): Promise<BaseEntity[]> {
    const response = await categoriesAPI.getCategories();
    return response.data;
  },

  async createCategory(data: Omit<BaseEntity, 'id'>): Promise<BaseEntity> {
    const result = await categoriesAPI.createCategory(data as { cod: string, name: string });
    return result;
  },

  async updateCategory(id: number, data: Omit<BaseEntity, 'id'>): Promise<BaseEntity> {
    const result = await categoriesAPI.updateCategory(id, data as { cod?: string, name?: string });
    return result;
  },

  async deleteCategory(id: number): Promise<void> {
    await categoriesAPI.deleteCategory(id);
  }
};

const fields = [
  {
    key: 'cod',
    label: 'Código',
    placeholder: 'Ej: QUI',
    maxLength: 5,
    required: true
  },
  {
    key: 'name',
    label: 'Categoría',
    placeholder: 'Nombre de la categoría',
    required: true
  }
];

export function CategoriesManagement() {
  return (
    <BaseEntityManagement
      entityName="Categoría"
      entityNamePlural="Categorías"
      fields={fields}
      loadItems={realCategoriesAPI.loadCategories}
      createItem={realCategoriesAPI.createCategory}
      updateItem={realCategoriesAPI.updateCategory}
      deleteItem={realCategoriesAPI.deleteCategory}
    />
  );
}