import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowLeft, ArrowUpDown, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

function AllCustomersPage() {
  const location = useLocation();
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);

  const { data: customers = [], isLoading: loading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data;
    },
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: () => <div className="w-[50px]">ID</div>,
        cell: info => (
          <span className="font-mono text-slate-400 w-[50px] block">#{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-slate-300 hover:text-white p-0 hover:bg-transparent font-semibold"
          >
            Customer Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="h-9 w-9 rounded-full bg-slate-700 overflow-hidden border border-slate-600 flex-shrink-0">
              <img
                src={row.original.customer_logo_url}
                alt={row.getValue('name')}
                className="h-full w-full object-cover"
                onError={e => {
                  e.target.src = 'https://via.placeholder.com/100?text=C';
                }}
              />
            </div>
            <span className="font-medium text-slate-100 truncate">{row.getValue('name')}</span>
          </div>
        ),
      },
      {
        accessorKey: 'contact',
        header: ({ column }) => (
          <div className="text-center font-semibold text-slate-300">Contact Info</div>
        ),
        cell: info => (
          <div className="text-slate-400 font-medium text-center">{info.getValue()}</div>
        ),
      },
      {
        accessorKey: 'address',
        header: ({ column }) => (
          <div className="text-center font-semibold text-slate-300">Address</div>
        ),
        cell: info => (
          <div
            className="text-slate-400 truncate max-w-[350px] mx-auto text-center"
            title={info.getValue()}
          >
            {info.getValue()}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2 min-w-[140px]">
            <Link to={`/customers/${row.original.id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 h-8"
              >
                View
              </Button>
            </Link>
            <Link to={`/customers/${row.original.id}/edit`} state={{ from: location.pathname }}>
              <Button
                size="sm"
                variant="ghost"
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 h-8"
              >
                Edit
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [location.pathname],
  );

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
    state: {
      sorting,
      columnFilters,
    },
  });
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col">
          <Link to="/" className="flex items-center text-slate-400 hover:text-white transition-colors mb-4 w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Customer Database</h1>
              <p className="text-slate-400">Manage customer records and view order history</p>
            </div>

            <Link to="/customers/create">
              <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm border-0">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
              </Button>
            </Link>
          </div>

          <Card className="bg-slate-800 border border-slate-700 shadow-sm">
            <CardHeader className="p-6 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search customers..."
                    value={table.getColumn('name')?.getFilterValue() ?? ''}
                    onChange={event => table.getColumn('name')?.setFilterValue(event.target.value)}
                    className="pl-9 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-900/50">
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow
                        key={headerGroup.id}
                        className="border-slate-700 hover:bg-transparent"
                      >
                        {headerGroup.headers.map(header => (
                          <TableHead key={header.id} className="text-slate-400 font-semibold h-12">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map(row => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          className="border-slate-700 hover:bg-slate-700/50 transition-colors"
                        >
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id} className="py-4">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-slate-500"
                        >
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end space-x-2 p-4 border-t border-slate-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white bg-transparent"
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AllCustomersPage;
