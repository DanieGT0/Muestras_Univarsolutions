import { BaseEntityManagement, type BaseEntity } from './BaseEntityManagement';
import { countriesAPI } from '../../lib/api';

// Real API functions for countries
const realCountriesAPI = {
  async loadCountries(): Promise<BaseEntity[]> {
    const response = await countriesAPI.getCountries();
    return response.data;
  },

  async createCountry(data: Omit<BaseEntity, 'id'>): Promise<BaseEntity> {
    const result = await countriesAPI.createCountry(data as { cod: string, name: string });
    return result;
  },

  async updateCountry(id: number, data: Omit<BaseEntity, 'id'>): Promise<BaseEntity> {
    const result = await countriesAPI.updateCountry(id, data as { cod?: string, name?: string });
    return result;
  },

  async deleteCountry(id: number): Promise<void> {
    await countriesAPI.deleteCountry(id);
  }
};

const fields = [
  {
    key: 'cod',
    label: 'Código',
    placeholder: 'Ej: CO',
    maxLength: 3,
    required: true
  },
  {
    key: 'name',
    label: 'País',
    placeholder: 'Nombre del país',
    required: true
  }
];

export function CountriesManagement() {
  return (
    <BaseEntityManagement
      entityName="País"
      entityNamePlural="Países"
      fields={fields}
      loadItems={realCountriesAPI.loadCountries}
      createItem={realCountriesAPI.createCountry}
      updateItem={realCountriesAPI.updateCountry}
      deleteItem={realCountriesAPI.deleteCountry}
    />
  );
}