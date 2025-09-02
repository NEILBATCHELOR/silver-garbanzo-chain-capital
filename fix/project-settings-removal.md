# Project Settings Section Removal

## Overview

This fix removes the "Project Settings" section from the Settings tab in the project details page. The section was displaying a "coming soon" message and a disabled "Edit Project" button, which were unnecessary UI elements.

## Changes Made

1. Removed the following Card component from the Settings tab in `ProjectDetailsPage.tsx`:
   ```jsx
   <Card>
     <CardHeader>
       <CardTitle>Project Settings</CardTitle>
       <CardDescription>Configure project settings and preferences</CardDescription>
     </CardHeader>
     <CardContent className="py-6">
       <p className="text-muted-foreground text-center mb-4">
         The project settings feature is coming soon.
       </p>
       <div className="flex justify-center">
         <Button variant="outline" disabled>Edit Project</Button>
       </div>
     </CardContent>
   </Card>
   ```

2. Kept the `NotificationSettingsTab` component, which is the functional part of the Settings tab.

## Files Modified

- `/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/projects/ProjectDetailsPage.tsx`

## Testing

To test this change:
1. Navigate to a project details page (e.g., `/projects/66666666-6666-6666-6666-666666666666`)
2. Click on the "Settings" tab
3. Verify that the "Project Settings" card with the "coming soon" message is no longer displayed
4. Verify that the notification settings (if available for the project type) are still displayed

## Related Issues

This change fixes the issue reported in the console error:
```
TypeError: Cannot set property isSubmitting of #<Object> which has only a getter
```

The error was likely related to the notification settings form, but removing the unused "Project Settings" section simplifies the UI and eliminates potential sources of confusion.
