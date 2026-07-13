using UnityEngine;

public class ClickableNPC : MonoBehaviour
{
    [SerializeField] private string npcName = "Main Assistant";

    // OnMouseDown is a built-in Unity message — it fires automatically
    // when this object (which has a Collider2D) is clicked, no extra
    // setup like an EventSystem or Raycaster needed.
    private void OnMouseDown()
    {
        Debug.Log($"Clicked on: {npcName}");
        ChatPanelController.Instance.Toggle();
    }
}