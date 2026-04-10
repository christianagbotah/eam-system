import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assetService } from '@/services'
import { Asset } from '@/types'

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: () => assetService.getAll(),
  })
}

export function useAsset(id: string | number) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: () => assetService.getById(id),
    enabled: !!id,
  })
}

export function useCreateAsset() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Asset>) => assetService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Asset> }) => 
      assetService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => assetService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}
