import { useState } from "react"
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Supplier {
  id: string
  name: string
  cnpj: string
  email: string
  phone: string
  category: string
  status: 'active' | 'inactive' | 'pending'
  lastOrder: string
  totalValue: number
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'TechSolutions LTDA',
    cnpj: '12.345.678/0001-90',
    email: 'contato@techsolutions.com.br',
    phone: '(11) 9999-8888',
    category: 'Tecnologia',
    status: 'active',
    lastOrder: '2024-01-15',
    totalValue: 125000
  },
  {
    id: '2',
    name: 'Mobiliário Corporativo SA',
    cnpj: '98.765.432/0001-10',
    email: 'vendas@mobiliario.com.br',
    phone: '(11) 7777-6666',
    category: 'Móveis',
    status: 'active',
    lastOrder: '2023-12-08',
    totalValue: 67500
  },
  {
    id: '3',
    name: 'Serviços de Limpeza Clean',
    cnpj: '55.444.333/0001-22',
    email: 'admin@clean.com.br',
    phone: '(11) 5555-4444',
    category: 'Serviços',
    status: 'pending',
    lastOrder: '2023-11-20',
    totalValue: 24000
  }
]

const getStatusBadge = (status: Supplier['status']) => {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-success text-success-foreground">Ativo</Badge>
    case 'inactive':
      return <Badge variant="destructive">Inativo</Badge>
    case 'pending':
      return <Badge variant="secondary" className="bg-warning text-warning-foreground">Pendente</Badge>
    default:
      return <Badge variant="secondary">-</Badge>
  }
}

export default function Fornecedores() {
  const [searchTerm, setSearchTerm] = useState("")
  const [suppliers] = useState<Supplier[]>(mockSuppliers)

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.cnpj.includes(searchTerm) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus parceiros comerciais</p>
        </div>
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Fornecedor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold text-foreground">23</div>
                <p className="text-sm text-muted-foreground">Total de Fornecedores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">18</div>
            <p className="text-sm text-muted-foreground">Fornecedores Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">3</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">R$ 216.500</div>
            <p className="text-sm text-muted-foreground">Valor Total Contratado</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="default">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Último Pedido</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.cnpj}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{supplier.email}</div>
                        <div className="text-xs text-muted-foreground">{supplier.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>{supplier.category}</TableCell>
                    <TableCell>{new Date(supplier.lastOrder).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>R$ {supplier.totalValue.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}