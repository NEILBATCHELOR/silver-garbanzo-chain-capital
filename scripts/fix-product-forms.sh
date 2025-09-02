#!/bin/bash
# Script to fix product form components

# Base directory for the form components
FORMS_DIR="/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms"

# List of form files to fix
FORMS=(
  "AssetBackedProductForm.tsx"
  "BondProductForm.tsx"
  "CollectiblesProductForm.tsx"
  "CommoditiesProductForm.tsx"
  "EquityProductForm.tsx"
  "FundProductForm.tsx"
  "InfrastructureProductForm.tsx"
  "PrivateDebtProductForm.tsx"
  "PrivateEquityProductForm.tsx"
  "QuantitativeInvestmentStrategyProductForm.tsx"
  "RealEstateProductForm.tsx"
)

for form in "${FORMS[@]}"; do
  file_path="$FORMS_DIR/$form"
  echo "Fixing $form..."
  
  # 1. Add onCancel parameter to component props
  sed -i '' -E 's/(export default function [A-Za-z]+Form\(\{ [^}]*defaultValues, [^}]*onSubmit, [^}]*isSubmitting = false)([^}]*\}: [A-Za-z]+FormProps\) \{)/\1, onCancel\2/g' "$file_path"
  
  # 2. Add mode: 'onSubmit' to useForm
  sed -i '' -E 's/(const form = useForm<[^>]*>\(\{[^}]*resolver: zodResolver\([^)]*\),[^}]*defaultValues: [^}]*as any,)( *\}\);)/\1\n    mode: '\''onSubmit'\'',\2/g' "$file_path"
  
  # 3. Add onError handler after useForm
  sed -i '' -E 's/(const form = useForm[^;]*;)/\1\n  \n  \/\/ For debugging form validation errors\n  const onError = \(errors: any\) => \{\n    console.error\('\''Form validation errors:'\', errors\);\n  \};/g' "$file_path"
  
  # 4. Update form onSubmit to include onError handler
  sed -i '' -E 's/(<form onSubmit={form.handleSubmit\(handleSubmit\))( className="space-y-6">)/\1, onError\)\2/g' "$file_path"
  
  # 5. Add console.log to beginning of handleSubmit
  form_name=$(echo "$form" | sed 's/\.tsx//g')
  sed -i '' -E "s/(const handleSubmit = async \(data: [^)]*\) => \{)/\1\n    console.log('$form_name handleSubmit called with data:', data);/g" "$file_path"
  
  # 6. Add try/catch block around onSubmit call
  sed -i '' -E 's/(await onSubmit\([^)]*\);)/console.log\('\''Calling onSubmit with formData:'\'', formData\);\n    try \{\n      \1\n      console.log\('\''onSubmit completed successfully'\''\);\n    \} catch \(error\) \{\n      console.error\('\''Error in onSubmit:'\'', error\);\n    \}/g' "$file_path"
  
  # 7. Replace the submit button section
  sed -i '' -E 's/(<div className="flex justify-end">.*<\/Button>.*<\/div>)/<div className="flex justify-end space-x-2">\n          {onCancel \&\& (\n            <Button type="button" variant="outline" onClick={onCancel}>\n              Cancel\n            <\/Button>\n          )}\n          <Button type="button" variant="secondary" onClick={() => {\n            console.log('\''Debug: Current form values:'\'', form.getValues());\n            console.log('\''Debug: Form state:'\'', form.formState);\n            form.handleSubmit(handleSubmit, onError)();\n          }}>\n            Debug Submit\n          <\/Button>\n          <Button type="submit" disabled={isSubmitting}>\n            {isSubmitting ? (\n              <>\n                <Loader2 className="mr-2 h-4 w-4 animate-spin" \/>\n                Saving...\n              <\/>\n            ) : (\n              '\''Save Product Details'\''\n            )}\n          <\/Button>\n        <\/div>/g' "$file_path"
  
  echo "Fixed $form"
done

echo "All product forms have been fixed!"
