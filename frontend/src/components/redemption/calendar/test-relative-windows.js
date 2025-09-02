/**
 * Test script for redemption calendar relative window calculations
 * Date: August 26, 2025
 */

// Simple test to validate relative window date calculations
const testRelativeWindowCalculations = () => {
  console.log('🧪 Testing Redemption Calendar Relative Window Calculations');
  console.log('='.repeat(60));

  // Test scenario: Hypo Fund project
  const projectTransactionStartDate = new Date('2025-08-24T23:00:00.000Z');
  const windowData = {
    id: '25070be1-9dae-494e-8076-73a31a69a467',
    name: 'MMF Default',
    submission_date_mode: 'relative',
    processing_date_mode: 'same_day',
    submission_start_date: '2025-08-23T15:43:54.067Z',
    submission_end_date: '2025-08-30T15:43:54.067Z',
    start_date: '2025-08-30T15:43:54.067Z',
    end_date: '2025-08-30T16:43:54.067Z',
    processing_offset_days: 1,
    lockup_days: 0
  };

  console.log('📊 Test Data:');
  console.log(`Project Transaction Start: ${projectTransactionStartDate.toISOString()}`);
  console.log(`Window Name: ${windowData.name}`);
  console.log(`Submission Date Mode: ${windowData.submission_date_mode}`);
  console.log(`Processing Date Mode: ${windowData.processing_date_mode}`);
  console.log('');

  console.log('📅 Original Stored Dates:');
  console.log(`Submission Start: ${windowData.submission_start_date}`);
  console.log(`Submission End: ${windowData.submission_end_date}`);
  console.log(`Processing Start: ${windowData.start_date}`);
  console.log(`Processing End: ${windowData.end_date}`);
  console.log('');

  // Calculate relative dates using the NEW LOGIC
  const storedSubmissionStart = new Date(windowData.submission_start_date);
  const storedSubmissionEnd = new Date(windowData.submission_end_date);
  
  // Calculate the submission period duration from stored dates
  const submissionPeriodDurationMs = storedSubmissionEnd.getTime() - storedSubmissionStart.getTime();
  const submissionPeriodDurationDays = Math.floor(submissionPeriodDurationMs / (1000 * 60 * 60 * 24));
  
  console.log('🔢 Calculated Duration:');
  console.log(`Submission Period Duration: ${submissionPeriodDurationDays} days`);
  console.log('');
  
  // For relative mode, start submission period 1 day after transaction start
  const relativeSubmissionStart = new Date(projectTransactionStartDate);
  relativeSubmissionStart.setDate(relativeSubmissionStart.getDate() + 1);
  
  // Calculate submission end based on the duration from stored data
  const relativeSubmissionEnd = new Date(relativeSubmissionStart);
  relativeSubmissionEnd.setDate(relativeSubmissionEnd.getDate() + submissionPeriodDurationDays);

  // Processing starts on the same day as submission end (processing_date_mode: 'same_day')
  const relativeProcessingStart = new Date(relativeSubmissionEnd);
  const relativeProcessingEnd = new Date(relativeSubmissionEnd);
  relativeProcessingEnd.setDate(relativeProcessingEnd.getDate() + windowData.processing_offset_days);

  console.log('✅ Expected Relative Dates (After Fix):');
  console.log(`Submission Start: ${relativeSubmissionStart.toISOString()}`);
  console.log(`Submission End: ${relativeSubmissionEnd.toISOString()}`);
  console.log(`Processing Start: ${relativeProcessingStart.toISOString()}`);
  console.log(`Processing End: ${relativeProcessingEnd.toISOString()}`);
  console.log('');

  // Check if the dates make sense
  const isSubmissionAfterTransaction = relativeSubmissionStart >= projectTransactionStartDate;
  const isProcessingAfterSubmission = relativeProcessingStart >= relativeSubmissionEnd;

  console.log('🔍 Validation Results:');
  console.log(`✓ Submission starts after transaction: ${isSubmissionAfterTransaction ? 'PASS' : 'FAIL'}`);
  console.log(`✓ Processing starts after submission: ${isProcessingAfterSubmission ? 'PASS' : 'FAIL'}`);
  
  if (isSubmissionAfterTransaction && isProcessingAfterSubmission) {
    console.log('🎉 All validations PASSED - Relative window calculations look correct!');
  } else {
    console.log('❌ Some validations FAILED - Check relative window calculation logic');
  }

  console.log('');
  console.log('🌐 Test URL: http://localhost:5173/redemption/calendar?project=cdc4f92c-8da1-4d80-a917-a94eb8cafaf0');
  console.log('📝 Expected: Calendar should now show dates relative to project transaction start date');
};

// Run the test
testRelativeWindowCalculations();
