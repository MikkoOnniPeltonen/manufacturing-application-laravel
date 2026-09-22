import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { apiClient } from '../api/client';
import { collectionItems } from '../api/collections';

function CustomerForm({ onSubmit, customerData = {}, buttonText, existingCustomers = [] }) {
  const [formData, setFormData] = useState({
    name: customerData.name || '',
    customer_logo_url: customerData.customer_logo_url || '',
    contact: customerData.contact || '',
    address: customerData.address || '',
  });

  const [errors, setErrors] = useState({});
  const [productList, setProductList] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(
    customerData.selected_products?.map(p => ({ value: p.id, label: p.name })) || [],
  );

  useEffect(() => {
    let cancelled = false;
    apiClient.GET('/v1/products').then(({ data, error }) => {
      if (cancelled || error) return;
      setProductList(collectionItems(data));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear specifically targeted error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Real-time duplicate name validation
    if (name === 'name' && value.trim()) {
      const isDuplicate = existingCustomers.some(
        c => c.name.toLowerCase() === value.trim().toLowerCase() && c.id !== customerData.id, // Verify it's not the same customer (for edit mode)
      );

      if (isDuplicate) {
        setErrors(prev => ({ ...prev, name: 'Customer name already exists' }));
      } else {
        setErrors(prev => ({ ...prev, name: '' }));
      }
    }
  };

  const handleFormSubmit = e => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required';
    } else if (errors.name) {
      newErrors.name = errors.name; // Preserve duplicate error
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      selected_product_ids: selectedProducts.map(p => p.value),
    });
  };

  const productOptions = productList.map(product => ({
    value: product.id,
    label: product.name,
  }));

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'rgb(51 65 85)',
      borderColor: state.isFocused ? 'rgb(59 130 246)' : 'rgb(71 85 105)',
      boxShadow: state.isFocused ? '0 0 0 2px rgb(59 130 246)' : 'none',
      '&:hover': {
        borderColor: 'rgb(71 85 105)',
      },
      color: 'white',
      minHeight: '42px',
    }),
    menu: provided => ({
      ...provided,
      backgroundColor: 'rgb(51 65 85)',
      border: '1px solid rgb(71 85 105)',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'rgb(59 130 246)' : 'rgb(51 65 85)',
      color: 'white',
      '&:hover': {
        backgroundColor: 'rgb(37 99 235)',
      },
    }),
    multiValue: provided => ({
      ...provided,
      backgroundColor: 'rgb(30 58 138)',
    }),
    multiValueLabel: provided => ({
      ...provided,
      color: 'rgb(191 219 254)',
    }),
    multiValueRemove: provided => ({
      ...provided,
      color: 'rgb(147 197 253)',
      '&:hover': {
        backgroundColor: 'rgb(29 78 216)',
        color: 'white',
      },
    }),
    input: provided => ({
      ...provided,
      color: 'white',
    }),
    placeholder: provided => ({
      ...provided,
      color: 'rgb(148 163 184)',
    }),
    singleValue: provided => ({
      ...provided,
      color: 'white',
    }),
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
          Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter Customer Name"
          id="name"
          className={`w-full px-3 py-2 bg-slate-700 border ${errors.name ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all`}
        />
        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label
          htmlFor="customer_logo_url"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Brand Logo URL
        </label>
        <input
          type="text"
          name="customer_logo_url"
          value={formData.customer_logo_url}
          onChange={handleChange}
          placeholder="Enter Customer Logo URL"
          id="customer_logo_url"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-slate-300 mb-1">
          Contact
        </label>
        <input
          type="text"
          name="contact"
          value={formData.contact}
          onChange={handleChange}
          placeholder="Enter Customer contact info"
          id="contact"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-1">
          Address
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter Customer Address"
          id="address"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label
          htmlFor="selected_products"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          Products
        </label>
        <Select
          isMulti
          id="selected_products"
          value={selectedProducts}
          onChange={setSelectedProducts}
          options={productOptions}
          styles={customStyles}
          placeholder="Select products..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>

      <Button
        type="submit"
        disabled={!!errors.name}
        className={`w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2.5 shadow-lg shadow-blue-500/25 transition-all ${errors.name ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {buttonText}
      </Button>
    </form>
  );
}

export default CustomerForm;
