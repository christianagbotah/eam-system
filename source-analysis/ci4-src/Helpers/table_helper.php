<?php

if (!function_exists('render_responsive_table')) {
    /**
     * Render responsive DataTable
     * 
     * @param array $config Table configuration
     * @return string HTML output
     */
    function render_responsive_table($config = []) {
        $defaults = [
            'tableId' => 'dataTable_' . uniqid(),
            'columns' => [],
            'ajaxUrl' => '',
            'filters' => [],
            'buttons' => ['copy', 'excel', 'pdf', 'print'],
            'searchBuilder' => true
        ];
        
        $config = array_merge($defaults, $config);
        
        return view('components/responsive_table', $config);
    }
}

if (!function_exists('format_table_data')) {
    /**
     * Format data for DataTables server-side processing
     * 
     * @param array $data Raw data
     * @param array $columns Column definitions
     * @param int $totalRecords Total records count
     * @param int $filteredRecords Filtered records count
     * @param int $draw Draw counter
     * @return array Formatted response
     */
    function format_table_data($data, $columns, $totalRecords, $filteredRecords, $draw) {
        $formattedData = [];
        
        foreach ($data as $row) {
            $formattedRow = [];
            foreach ($columns as $column) {
                $field = $column['data'];
                $value = $row[$field] ?? '';
                
                // Apply formatting based on column type
                if (isset($column['render'])) {
                    $value = call_user_func($column['render'], $value, $row);
                }
                
                $formattedRow[] = $value;
            }
            $formattedData[] = $formattedRow;
        }
        
        return [
            'draw' => intval($draw),
            'recordsTotal' => $totalRecords,
            'recordsFiltered' => $filteredRecords,
            'data' => $formattedData
        ];
    }
}

if (!function_exists('get_datatable_params')) {
    /**
     * Extract DataTables parameters from request
     * 
     * @param object $request CodeIgniter request object
     * @return array Parameters
     */
    function get_datatable_params($request) {
        return [
            'draw' => $request->getPost('draw') ?? 1,
            'start' => $request->getPost('start') ?? 0,
            'length' => $request->getPost('length') ?? 25,
            'search' => $request->getPost('search')['value'] ?? '',
            'order_column' => $request->getPost('order')[0]['column'] ?? 0,
            'order_dir' => $request->getPost('order')[0]['dir'] ?? 'desc'
        ];
    }
}