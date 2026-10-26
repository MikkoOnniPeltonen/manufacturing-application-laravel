import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { fetchCollection } from '../api/collections';
import CustomAlertDialog from '../components/CustomAlertDialog';
import CustomerForm from '../components/CustomerForm';
import type { CustomerInput } from '../types';

function CreateCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const { data: existingCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      return fetchCollection(page =>
        apiClient.GET('/v1/customers', { params: { query: { page, per_page: 100 } } }),
      );
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (newCustomer: CustomerInput) => {
      const { data, error } = await apiClient.POST('/v1/customers', {
        body: {
          ...newCustomer,
        },
      });
      if (error || !data) throw error ?? new Error('Unable to create customer.');
      return data;
    },
    onSuccess: () => {
      toast.success('New Customer added successfully!');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setTimeout(() => navigate('/customers'), 1500);
    },
    onError: error => {
      console.error(error);
      setErrorDialogOpen(true);
    },
  });

  const handleCreateCustomer = async (newCustomer: CustomerInput) => {
    // Check for duplicate name (Client-side optimization)
    // Note: Backend should also validate unique names
    const isDuplicate = existingCustomers.some(
      c => c.name.toLowerCase() === newCustomer.name.trim().toLowerCase(),
    );

    if (isDuplicate) {
      toast.error('A customer with this name already exists!');
      return;
    }

    createCustomerMutation.mutate(newCustomer);
  };

  const handleErrorDialogClose = () => setErrorDialogOpen(false);
  const handleRetry = () => setErrorDialogOpen(false);

  return (
    <div className="workspace-page">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-sm rounded-xl bg-card border-border">
          <CardHeader className="p-6 bg-background/50 border-b border-border">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Create Customer
            </h1>
          </CardHeader>
          <CardContent className="p-6">
            <CustomerForm
              onSubmit={handleCreateCustomer}
              buttonText="Create Customer"
              existingCustomers={existingCustomers}
            />
            <div className="mt-6 pt-6 border-t border-border">
              <Button
                type="button"
                onClick={() => navigate('/customers')}
                className="w-full bg-secondary hover:bg-secondary text-foreground border border-border"
              >
                Cancel / Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
        <CustomAlertDialog
          isOpen={errorDialogOpen}
          onOpenChange={setErrorDialogOpen}
          title="Error"
          description="Failed to add new customer. Please try again."
          onCancel={handleErrorDialogClose}
          onConfirm={handleRetry}
          confirmText="Retry"
          cancelText="Go back to form"
        />
      </div>
    </div>
  );
}

export default CreateCustomerPage;
