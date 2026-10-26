import { Button } from '@/components/ui/button';
import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import Select, { type StylesConfig } from 'react-select';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import type { Customer, CustomerInput, Product } from '../types';

function CustomerForm({
  onSubmit,
  customerData = {},
  buttonText,
  existingCustomers = [],
}: {
  onSubmit: (input: CustomerInput) => void;
  customerData?: Partial<Customer>;
  buttonText: string;
  existingCustomers?: Customer[];
}) {
  const [formData, setFormData] = useState({
    name: customerData.name || '',
    customer_logo_url: customerData.customer_logo_url || '',
    contact: customerData.contact || '',
    address: customerData.address || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productList, setProductList] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState(
    customerData.selected_products?.map(p => ({ value: p.id, label: p.name })) || [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchCollection(page =>
      apiClient.GET('/v1/products', { params: { query: { page, per_page: 100 } } }),
    )
      .then(products => {
        if (!cancelled) setProductList(products);
      })
      .catch(() => {
        if (!cancelled)
          setErrors(prev => ({
            ...prev,
            products: 'Unable to load products. Reload before saving.',
          }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
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

  const customStyles: StylesConfig<{ value: number; label: string }, true> = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'hsl(var(--card))',
      borderColor: state.isFocused ? 'hsl(var(--ring))' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--ring))' : 'none',
      '&:hover': {
        borderColor: 'hsl(var(--border))',
      },
      color: 'hsl(var(--foreground))',
      minHeight: '44px',
    }),
    menu: provided => ({
      ...provided,
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? 'hsl(var(--accent))' : 'hsl(var(--card))',
      color: 'hsl(var(--foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent))',
      },
    }),
    multiValue: provided => ({
      ...provided,
      backgroundColor: 'hsl(var(--accent))',
    }),
    multiValueLabel: provided => ({
      ...provided,
      color: 'hsl(var(--accent-foreground))',
    }),
    multiValueRemove: provided => ({
      ...provided,
      color: 'hsl(var(--accent-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--accent))',
        color: 'hsl(var(--foreground))',
      },
    }),
    input: provided => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
    placeholder: provided => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
    }),
    singleValue: provided => ({
      ...provided,
      color: 'hsl(var(--foreground))',
    }),
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
          Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter Customer Name"
          id="name"
          className={`w-full px-3 py-2 bg-secondary border ${errors.name ? 'border-destructive' : 'border-border'} rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all`}
        />
        {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label
          htmlFor="customer_logo_url"
          className="block text-sm font-medium text-foreground mb-2"
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
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-foreground mb-2">
          Contact
        </label>
        <input
          type="text"
          name="contact"
          value={formData.contact}
          onChange={handleChange}
          placeholder="Enter Customer contact info"
          id="contact"
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-foreground mb-2">
          Address
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Enter Customer Address"
          id="address"
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
        />
      </div>

      <div>
        <label
          htmlFor="selected_products"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Products
        </label>
        <Select
          isMulti
          inputId="selected_products"
          value={selectedProducts}
          onChange={products => setSelectedProducts([...products])}
          options={productOptions}
          styles={customStyles}
          placeholder="Select products..."
          className="react-select-container"
          classNamePrefix="react-select"
        />
      </div>

      {errors.products && (
        <p role="alert" className="text-destructive">
          {errors.products}
        </p>
      )}
      <Button
        type="submit"
        disabled={!!errors.name || !!errors.products}
        className={`w-full bg-primary text-primary-foreground font-semibold py-2.5 shadow-sm shadow-primary/5 transition-all ${errors.name ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {buttonText}
      </Button>
    </form>
  );
}

export default CustomerForm;
