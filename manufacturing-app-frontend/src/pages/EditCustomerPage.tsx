import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import CustomAlertDialog from '../components/CustomAlertDialog';
import CustomerForm from '../components/CustomerForm';
import type { CustomerInput } from '../types';

function EditCustomerPage() {
  const queryClient = useQueryClient();
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { customerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || '/customers';

  // Fetch Customer
  const {
    data: customer,
    isLoading: loading,
    error: loadError,
  } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/customers/{customer}', {
        params: { path: { customer: Number(customerId) } },
      });
      if (error || !data) throw error ?? new Error('Unable to load customer.');
      return data;
    },
  });

  // Edit Mutation
  const editCustomerMutation = useMutation({
    mutationFn: async (updatedCustomer: CustomerInput) => {
      const { data, error } = await apiClient.PUT('/v1/customers/{customer}', {
        params: { path: { customer: Number(customerId) } },
        body: {
          ...updatedCustomer,
        },
      });
      if (error || !data) throw error ?? new Error('Unable to update customer.');
      return data;
    },
    onSuccess: () => {
      toast.success('Customer updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      setTimeout(() => navigate(backPath), 1500);
    },
    onError: error => {
      console.error(error);
      setErrorMessage('Failed to update customer.');
      setErrorDialogOpen(true);
    },
  });

  // Delete Mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.DELETE('/v1/customers/{customer}', {
        params: { path: { customer: Number(customerId) } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Customer deleted!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setTimeout(() => navigate('/customers'), 1500);
    },
    onError: error => {
      console.error(error);
      toast.error('Failed to delete customer.');
    },
  });

  async function handleEditCustomer(updatedCustomer: CustomerInput) {
    editCustomerMutation.mutate(updatedCustomer);
  }

  function handleDeleteCustomer() {
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = () => {
    deleteCustomerMutation.mutate();
    setDeleteDialogOpen(false);
  };

  if (loadError)
    return (
      <p role="alert" className="p-6 text-destructive">
        Unable to load this customer.
      </p>
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/25" />
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="max-w-2xl mx-auto">
        {customer && (
          <Card className="shadow-sm rounded-xl bg-card border-border">
            <CardHeader className="p-6 bg-background/50 border-b border-border">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Edit Customer
              </h1>
            </CardHeader>
            <CardContent className="p-6">
              <CustomerForm
                onSubmit={handleEditCustomer}
                customerData={customer}
                buttonText="Update Customer"
              />
              <div className="mt-6 pt-6 border-t border-border flex justify-between gap-4">
                <Button
                  type="button"
                  onClick={() => navigate(backPath)}
                  className="bg-secondary hover:bg-secondary text-foreground flex-1 border border-border"
                >
                  Close / Cancel
                </Button>
                <Button
                  onClick={handleDeleteCustomer}
                  className="bg-destructive hover:bg-destructive/90 text-primary-foreground shadow-sm flex-1"
                >
                  Delete Customer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <CustomAlertDialog
          isOpen={errorDialogOpen}
          onOpenChange={setErrorDialogOpen}
          title="Error"
          description={errorMessage}
          onCancel={() => setErrorDialogOpen(false)}
          onConfirm={() => setErrorDialogOpen(false)}
          confirmText="OK"
          cancelText="Close"
        />

        <CustomAlertDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Customer"
          description="Are you sure you want to delete this customer? This action cannot be undone."
          onCancel={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
}

export default EditCustomerPage;
