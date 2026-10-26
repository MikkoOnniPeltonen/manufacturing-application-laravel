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
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ArrowLeft, ArrowUpDown, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import { collectionItems } from '../api/collections';
import type { Customer } from '../types';

function AllCustomersPage() {
  const location = useLocation();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const {
    data: result,
    isLoading: loading,
    error: customersError,
  } = useQuery({
    queryKey: ['customers', pagination, sorting, columnFilters],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/v1/customers', {
        params: {
          query: {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: columnFilters[0]?.value ? String(columnFilters[0].value) : undefined,
            sort: sorting[0]?.id === 'name' ? 'name' : 'id',
            direction: sorting[0]?.desc ? 'desc' : 'asc',
          },
        },
      });
      if (error || !data) {
        throw error ?? new Error('Unable to load customers.');
      }
      return data;
    },
  });

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'id',
        header: () => <div className="w-[50px]">ID</div>,
        cell: info => (
          <span className="font-mono text-muted-foreground w-[50px] block">
            #{String(info.getValue() ?? '')}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-foreground hover:text-foreground p-0 hover:bg-transparent font-semibold"
          >
            Customer Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="h-9 w-9 rounded-full bg-secondary overflow-hidden border border-border flex-shrink-0">
              <img
                src={row.original.customer_logo_url ?? undefined}
                alt={String(row.getValue('name'))}
                className="h-full w-full object-cover"
                onError={e => {
                  e.currentTarget.src = 'https://via.placeholder.com/100?text=C';
                }}
              />
            </div>
            <span className="font-medium text-foreground truncate">
              {String(row.getValue('name'))}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'contact',
        header: () => <div className="text-center font-semibold text-foreground">Contact Info</div>,
        cell: info => (
          <div className="text-muted-foreground font-medium text-center">
            {String(info.getValue() ?? '')}
          </div>
        ),
      },
      {
        accessorKey: 'address',
        header: () => <div className="text-center font-semibold text-foreground">Address</div>,
        cell: info => (
          <div
            className="text-muted-foreground truncate max-w-[350px] mx-auto text-center"
            title={String(info.getValue() ?? '')}
          >
            {String(info.getValue() ?? '')}
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
                className="text-primary hover:text-primary hover:bg-accent/20 h-8"
              >
                View
              </Button>
            </Link>
            <Link to={`/customers/${row.original.id}/edit`} state={{ from: location.pathname }}>
              <Button
                size="sm"
                variant="ghost"
                className="text-warning hover:text-warning hover:bg-warning/10 h-8"
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
    data: collectionItems(result),
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: updater => {
      setColumnFilters(updater);
      setPagination(p => ({ ...p, pageIndex: 0 }));
    },
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: result?.last_page ?? 1,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },
  });
  if (customersError)
    return (
      <p role="alert" className="p-6 text-destructive">
        Unable to load customers.
      </p>
    );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary/25" />
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-6">
          <Link
            to="/"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-4 w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="workspace-title">Customer Database</h1>
              <p className="text-muted-foreground">
                Manage customer records and view order history
              </p>
            </div>

            <Link to="/customers/create">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm border-0">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Customer
              </Button>
            </Link>
          </div>

          <Card className="bg-card border border-border shadow-sm">
            <CardHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={String(table.getColumn('name')?.getFilterValue() ?? '')}
                    onChange={event => table.getColumn('name')?.setFilterValue(event.target.value)}
                    className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:ring-ring focus:border-primary/25"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader className="bg-background/50">
                    {table.getHeaderGroups().map(headerGroup => (
                      <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                        {headerGroup.headers.map(header => (
                          <TableHead
                            key={header.id}
                            className="text-muted-foreground font-semibold h-12"
                          >
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
                          className="border-border hover:bg-secondary/50 transition-colors"
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
                          className="h-24 text-center text-muted-foreground"
                        >
                          No results found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end space-x-2 p-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="border-border text-foreground hover:bg-secondary hover:text-foreground bg-transparent"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="border-border text-foreground hover:bg-secondary hover:text-foreground bg-transparent"
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
