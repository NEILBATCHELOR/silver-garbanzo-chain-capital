// Function to fix form component issues
function fixFormComponent(filePath) {
  // 1. Read file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 2. Make necessary replacements
  
  // Add mode: 'onSubmit' to useForm
  let updatedContent = content.replace(
    /const form = useForm<.*>\({[\s\S]*?resolver: zodResolver\([^)]*\),[\s\S]*?defaultValues: [^}]*}/m,
    (match) => match + ",\n    mode: 'onSubmit'"
  );
  
  // Add onError handler after form initialization
  if (!updatedContent.includes('const onError = (errors: any) => {')) {
    updatedContent = updatedContent.replace(
      /const form = useForm.*\n\s*\}\);/m,
      (match) => match + "\n  \n  // For debugging form validation errors\n  const onError = (errors: any) => {\n    console.error('Form validation errors:', errors);\n  };"
    );
  }
  
  // Enhance handleSubmit with error handling
  updatedContent = updatedContent.replace(
    /const handleSubmit = async \([^)]*\) => {[\s\S]*?await onSubmit\([^)]*\);/m,
    (match) => {
      if (match.includes('try {')) return match; // Already has error handling
      return match.replace(
        /await onSubmit\([^)]*\);/,
        "console.log('Calling onSubmit with formData:', formData);\n    try {\n      await onSubmit(formData);\n      console.log('onSubmit completed successfully');\n    } catch (error) {\n      console.error('Error in onSubmit:', error);\n    }"
      );
    }
  );
  
  // Add onError to form.handleSubmit
  updatedContent = updatedContent.replace(
    /form\.handleSubmit\(handleSubmit\)/g,
    "form.handleSubmit(handleSubmit, onError)"
  );
  
  // Add debug button before the submit button
  updatedContent = updatedContent.replace(
    /(<Button type="submit".*?>\s*{isSubmitting.*?}\s*<\/Button>)/s,
    `<Button type="button" variant="secondary" onClick={() => {
            console.log('Debug: Current form values:', form.getValues());
            console.log('Debug: Form state:', form.formState);
            form.handleSubmit(handleSubmit, onError)();
          }}>
            Debug Submit
          </Button>
          $1`
  );
  
  // 3. Write file
  fs.writeFileSync(filePath, updatedContent);
  
  console.log(`Fixed: ${filePath}`);
}

// Files to fix
const filesToFix = [
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/StructuredProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/DigitalTokenizedFundProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/EnergyProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/AssetBackedProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/CollectiblesProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/InfrastructureProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/RealEstateProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/PrivateDebtProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/QuantitativeInvestmentStrategyProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/BondProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/FundProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/CommoditiesProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/EquityProductForm.tsx",
  "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/products/product-forms/PrivateEquityProductForm.tsx"
];

// Fix all files
filesToFix.forEach(fixFormComponent);
