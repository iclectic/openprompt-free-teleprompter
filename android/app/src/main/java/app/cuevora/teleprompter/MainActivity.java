package app.cuevora.teleprompter;

import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStart() {
        super.onStart();
        bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                String[] requestedResources = request.getResources();
                java.util.List<String> allowedResources = new java.util.ArrayList<>();

                for (String resource : requestedResources) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)
                            || PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        allowedResources.add(resource);
                    }
                }

                if (allowedResources.isEmpty()) {
                    request.deny();
                    return;
                }

                request.grant(allowedResources.toArray(new String[0]));
            }
        });
    }
}
