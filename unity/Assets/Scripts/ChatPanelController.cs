using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class ChatPanelController : MonoBehaviour
{
    public static ChatPanelController Instance { get; private set; }

    [SerializeField] private GameObject panelRoot;
    [SerializeField] private ScrollRect scrollRect;
    [SerializeField] private Transform contentParent;
    [SerializeField] private GameObject messageRowPrefab;

    [Header("Bubble colors")]
    [SerializeField] private Color userColor = new Color(0.25f, 0.45f, 0.9f);
    [SerializeField] private Color assistantColor = new Color(0.25f, 0.25f, 0.28f);

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    public void Toggle()
    {
        panelRoot.SetActive(!panelRoot.activeSelf);
    }

    // isUser = true aligns right and uses userColor; false aligns left
    // with assistantColor — matches how most chat apps distinguish sides.
    public void AddMessage(string text, bool isUser)
    {
        GameObject row = Instantiate(messageRowPrefab, contentParent);
        HorizontalLayoutGroup layout = row.GetComponent<HorizontalLayoutGroup>();
        layout.childAlignment = isUser ? TextAnchor.MiddleRight : TextAnchor.MiddleLeft;

        Transform bubble = row.transform.Find("Bubble");
        bubble.GetComponent<Image>().color = isUser ? userColor : assistantColor;
        bubble.Find("MessageText").GetComponent<TMP_Text>().text = text;

        // Force layout to recalculate immediately, then snap scroll to the
        // bottom so the newest message is always visible without you
        // needing to manually drag the scrollbar down each time.
        Canvas.ForceUpdateCanvases();
        scrollRect.verticalNormalizedPosition = 0f;
    }
}