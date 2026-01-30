import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CustomAlertDialog from '../components/CustomAlertDialog';
import CustomerForm from '../components/CustomerForm';
import api from '../lib/api';

function CreateCustomerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const { data: existingCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (newCustomer) => {
      return api.post('/customers', newCustomer);
    },
    onSuccess: () => {
      toast.success('New Customer added successfully!');
      queryClient.invalidateQueries(['customers']);
      setTimeout(() => navigate('/customers'), 1500);
    },
    onError: (error) => {
      console.error(error);
      setErrorDialogOpen(true);
    }
  });

  const handleCreateCustomer = async newCustomer => {
    // Check for duplicate name (Client-side optimization)
    // Note: Backend should also validate unique names
    const isDuplicate = existingCustomers.some(
      c => c.name.toLowerCase() === newCustomer.name.trim().toLowerCase()
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
    <div className="min-h-screen bg-slate-900 py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg rounded-xl bg-slate-800 border-slate-700">
          <CardHeader className="p-6 bg-slate-900/50 border-b border-slate-700">
            <CardTitle className="text-2xl font-bold text-white">Create Customer</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <CustomerForm
              onSubmit={handleCreateCustomer}
              buttonText="Create Customer"
              existingCustomers={existingCustomers}
            />
            <div className="mt-6 pt-6 border-t border-slate-700">
              <Button
                type="button"
                onClick={() => navigate('/customers')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white border border-slate-600"
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
