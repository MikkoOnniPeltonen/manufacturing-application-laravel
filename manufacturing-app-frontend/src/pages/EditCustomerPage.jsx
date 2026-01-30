import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CustomAlertDialog from '../components/CustomAlertDialog';
import CustomerForm from '../components/CustomerForm';
import api from '../lib/api';

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
  const { data: customer, isLoading: loading, isError } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await api.get(`/customers/${customerId}`);
      return response.data;
    },
    onError: () => {
      setErrorMessage('Failed to fetch customer data.');
      setErrorDialogOpen(true);
    }
  });

  // Edit Mutation
  const editCustomerMutation = useMutation({
    mutationFn: async (updatedCustomer) => {
      return api.put(`/customers/${customerId}`, updatedCustomer);
    },
    onSuccess: () => {
      toast.success('Customer updated successfully!');
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['customer', customerId]);
      setTimeout(() => navigate(backPath), 1500);
    },
    onError: (error) => {
      console.error(error);
      setErrorMessage('Failed to update customer.');
      setErrorDialogOpen(true);
    }
  });

  // Delete Mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/customers/${customerId}`);
    },
    onSuccess: () => {
      toast.success('Customer deleted!');
      queryClient.invalidateQueries(['customers']);
      setTimeout(() => navigate('/customers'), 1500);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to delete customer.');
    }
  });

  async function handleEditCustomer(updatedCustomer) {
    editCustomerMutation.mutate(updatedCustomer);
  }

  function handleDeleteCustomer() {
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = () => {
    deleteCustomerMutation.mutate();
    setDeleteDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-6">
      <div className="max-w-2xl mx-auto">
        {customer && (
          <Card className="shadow-lg rounded-xl bg-slate-800 border-slate-700">
            <CardHeader className="p-6 bg-slate-900/50 border-b border-slate-700">
              <CardTitle className="text-2xl font-bold text-white">Edit Customer</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CustomerForm
                onSubmit={handleEditCustomer}
                customerData={customer}
                buttonText="Update Customer"
              />
              <div className="mt-6 pt-6 border-t border-slate-700 flex justify-between gap-4">
                <Button
                  type="button"
                  onClick={() => navigate(backPath)}
                  className="bg-slate-700 hover:bg-slate-600 text-white flex-1 border border-slate-600"
                >
                  Close / Cancel
                </Button>
                <Button
                  onClick={handleDeleteCustomer}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-sm flex-1"
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
