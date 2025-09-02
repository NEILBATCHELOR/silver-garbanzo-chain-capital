#!/bin/bash

# Function to fix a product form component
fix_form() {
  form_name=$1
  file_path="/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/${form_name}.tsx"
  
  echo "Fixing ${form_name}..."
  
  # 1. Add onCancel to component props
  line=$(grep -n "export default function ${form_name}" "$file_path" | cut -d':' -f1)
  if [ -n "$line" ]; then
    end_line=$((line + 5))
    props_block=$(sed -n "${line},${end_line}p" "$file_path")
    
    if [[ $props_block != *"onCancel"* ]]; then
      new_props_block=$(echo "$props_block" | sed "s/isSubmitting = false/isSubmitting = false,\\n  onCancel/")
      sed -i '' "${line},${end_line}c\\
${new_props_block}" "$file_path"
    fi
  fi
  
  # 2. Add mode: 'onSubmit' to useForm
  form_line=$(grep -n "const form = useForm" "$file_path" | cut -d':' -f1)
  if [ -n "$form_line" ]; then
    form_end_line=$((form_line + 4))
    form_block=$(sed -n "${form_line},${form_end_line}p" "$file_path")
    
    if [[ $form_block != *"mode: 'onSubmit'"* ]]; then
      new_form_block=$(echo "$form_block" | sed "s/defaultValues: .*as any,/defaultValues: defaultValues as any,\\n    mode: 'onSubmit',/")
      sed -i '' "${form_line},${form_end_line}c\\
${new_form_block}
  
  // For debugging form validation errors
  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };" "$file_path"
    fi
  fi
  
  # 3. Enhance handleSubmit function
  submit_line=$(grep -n "const handleSubmit = async" "$file_path" | cut -d':' -f1)
  if [ -n "$submit_line" ]; then
    submit_end_line=$((submit_line + 4))
    submit_block=$(sed -n "${submit_line},${submit_end_line}p" "$file_path")
    
    if [[ $submit_block != *"console.log"* ]]; then
      new_submit_block="  const handleSubmit = async (data: z.infer<typeof ${form_name/Form/}Schema>) => {
    console.log('${form_name} handleSubmit called with data:', data);
    
    // Prepare the data for submission
    const formData = {
      ...data
    };

    console.log('Calling onSubmit with formData:', formData);
    try {
      await onSubmit(formData);
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  };"
      sed -i '' "${submit_line},${submit_end_line}c\\
${new_submit_block}" "$file_path"
    fi
  fi
  
  # 4. Update form onSubmit to include onError
  form_tag_line=$(grep -n "<form onSubmit={form.handleSubmit(handleSubmit)}" "$file_path" | cut -d':' -f1)
  if [ -n "$form_tag_line" ]; then
    sed -i '' "${form_tag_line}s/handleSubmit)}/handleSubmit, onError)}/g" "$file_path"
  fi
  
  # 5. Add Debug Submit button
  button_line=$(grep -n "flex justify-end" "$file_path" | cut -d':' -f1)
  if [ -n "$button_line" ]; then
    button_end_line=$((button_line + 14))
    button_block=$(sed -n "${button_line},${button_end_line}p" "$file_path")
    
    product_name=$(echo "${form_name}" | sed 's/ProductForm//')
    
    if [[ $button_block != *"Debug Submit"* ]]; then
      new_button_block="        <div className=\"flex justify-end space-x-2\">
          {onCancel && (
            <Button type=\"button\" variant=\"outline\" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type=\"button\" variant=\"secondary\" onClick={() => {
            console.log('Debug: Current form values:', form.getValues());
            console.log('Debug: Form state:', form.formState);
            form.handleSubmit(handleSubmit, onError)();
          }}>
            Debug Submit
          </Button>
          <Button type=\"submit\" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />
                Saving...
              </>
            ) : (
              'Save ${product_name} Details'
            )}
          </Button>
        </div>"
      sed -i '' "${button_line},${button_end_line}c\\
${new_button_block}" "$file_path"
    fi
  fi
  
  echo "Fixed ${form_name}"
}

# Forms to fix
forms=(
  "CollectiblesProductForm"
  "CommoditiesProductForm"
  "EquityProductForm"
  "FundProductForm"
  "InfrastructureProductForm"
  "PrivateDebtProductForm"
  "PrivateEquityProductForm"
  "QuantitativeInvestmentStrategyProductForm"
  "RealEstateProductForm"
)

# Fix each form
for form in "${forms[@]}"; do
  fix_form "$form"
done

echo "All product forms have been fixed!"
